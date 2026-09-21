"""
BlockchainService
=================
Central service for appending blocks and verifying chain integrity.
Import and call add_block() from any other Django view or signal.
"""

import hashlib
import json

from django.db import transaction
from django.utils import timezone

from .models import BlockchainBlock

# Thread-level lock to prevent race conditions on block_index
import threading
_lock = threading.Lock()


class BlockchainService:
    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _sha256(text: str) -> str:
        return hashlib.sha256(text.encode('utf-8')).hexdigest()

    @classmethod
    def _hash_actor(cls, performed_by: str) -> str:
        if performed_by == 'SYSTEM':
            return performed_by
        return cls._sha256(str(performed_by))

    @classmethod
    def _compute_block_hash(cls, index, timestamp_str, previous_hash,
                            data_hash, action_type, nonce) -> str:
        raw = f"{index}|{timestamp_str}|{previous_hash}|{data_hash}|{action_type}|{nonce}"
        return cls._sha256(raw)

    @staticmethod
    def _get_genesis_block():
        """Create the genesis block if the chain is empty."""
        payload = {'message': 'Genesis Block – PakVerify Blockchain Ledger'}
        payload_json = json.dumps(payload)
        data_hash = hashlib.sha256(payload_json.encode()).hexdigest()
        timestamp = timezone.now()
        ts = str(timestamp)
        previous_hash = '0' * 64
        nonce = 0
        action_type = 'GENESIS'
        raw = f"0|{ts}|{previous_hash}|{data_hash}|{action_type}|{nonce}"
        current_hash = hashlib.sha256(raw.encode()).hexdigest()

        return BlockchainBlock.objects.create(
            block_index=0,
            timestamp=timestamp,
            previous_hash=previous_hash,
            current_hash=current_hash,
            data_hash=data_hash,
            action_type=action_type,
            record_id='',
            performed_by='SYSTEM',
            nonce=nonce,
            payload_json=payload_json,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def add_block(cls, action_type: str, record_id: str,
                  performed_by: str, payload: dict) -> BlockchainBlock:
        """
        Append a new block to the chain.

        Parameters
        ----------
        action_type  : one of BlockchainBlock.ACTION_TYPES keys
        record_id    : str identifier of the related object (e.g. application pk)
        performed_by : CNIC of the actor or 'SYSTEM'
        payload      : dict of event metadata (NO passwords / sensitive PII)

        Returns
        -------
        The newly created BlockchainBlock instance.
        """
        valid_actions = {choice[0] for choice in BlockchainBlock.ACTION_TYPES}
        if action_type not in valid_actions:
            raise ValueError(f'Unsupported blockchain action type: {action_type}')

        with _lock, transaction.atomic():
            last = BlockchainBlock.objects.select_for_update().order_by('-block_index').first()

            # Auto-create genesis if chain is empty
            if last is None:
                last = cls._get_genesis_block()

            index         = last.block_index + 1
            previous_hash = last.current_hash

            # Sanitise payload – remove any accidental password/sensitive keys
            safe_keys = {
                'password', 'token', 'otp_code', 'otp', 'secret', 'refresh', 'access'
            }
            clean_payload = {k: v for k, v in payload.items()
                             if k.lower() not in safe_keys}

            payload_json = json.dumps(clean_payload, default=str)
            data_hash    = cls._sha256(payload_json)

            timestamp = timezone.now()
            ts = str(timestamp)
            nonce = 0
            current_hash = cls._compute_block_hash(
                index, ts, previous_hash, data_hash, action_type, nonce
            )

            return BlockchainBlock.objects.create(
                block_index=index,
                timestamp=timestamp,
                previous_hash=previous_hash,
                current_hash=current_hash,
                data_hash=data_hash,
                action_type=action_type,
                record_id=str(record_id),
                performed_by=cls._hash_actor(str(performed_by)),
                nonce=nonce,
                payload_json=payload_json,
            )

    @classmethod
    def verify_chain(cls) -> dict:
        """
        Walk the entire chain and verify:
        1. Each block's previous_hash matches the preceding block's current_hash.
        2. Each block's stored current_hash matches a recomputed hash.

        Returns a dict with:
          - valid (bool)
          - total_blocks (int)
          - issues (list of str)
        """
        blocks = list(BlockchainBlock.objects.order_by('block_index'))
        issues = []

        if not blocks:
            return {'valid': True, 'total_blocks': 0, 'issues': []}

        prev_hash = '0' * 64
        if blocks[0].block_index != 0 or blocks[0].action_type != 'GENESIS':
            issues.append('Chain must start with a GENESIS block at index 0')

        expected_index = 0
        for b in blocks:
            if b.block_index != expected_index:
                issues.append(
                    f'Block index gap or duplicate: expected {expected_index}, got {b.block_index}'
                )
                expected_index = b.block_index
            expected_index += 1

            # Check chain link
            if b.block_index == 0:
                # Genesis block: previous_hash should be all zeros
                if b.previous_hash != '0' * 64:
                    issues.append(f"Block #0 (Genesis): invalid previous_hash")
            else:
                if b.previous_hash != prev_hash:
                    issues.append(
                        f"Block #{b.block_index}: broken chain link "
                        f"(expected {prev_hash[:12]}…, got {b.previous_hash[:12]}…)"
                    )

            # Recompute and compare hash
            recomputed = cls._compute_block_hash(
                b.block_index,
                str(b.timestamp),
                b.previous_hash,
                b.data_hash,
                b.action_type,
                b.nonce,
            )
            data_hash_check = cls._sha256(b.payload_json)
            if data_hash_check != b.data_hash:
                issues.append(
                    f"Block #{b.block_index}: payload tampered "
                    f"(data_hash mismatch)"
                )

            if recomputed != b.current_hash:
                issues.append(
                    f"Block #{b.block_index}: current_hash mismatch "
                    f"(expected {recomputed[:12]}…, got {b.current_hash[:12]}…)"
                )

            prev_hash = b.current_hash

        return {
            'valid': len(issues) == 0,
            'total_blocks': len(blocks),
            'issues': issues,
        }

    @classmethod
    def get_record_history(cls, record_id: str):
        """Return all blocks for a specific record_id."""
        return BlockchainBlock.objects.filter(record_id=str(record_id)).order_by('block_index')
