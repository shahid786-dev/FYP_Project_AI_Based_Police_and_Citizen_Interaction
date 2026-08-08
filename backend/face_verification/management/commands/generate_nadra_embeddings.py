"""
face_verification/management/commands/generate_nadra_embeddings.py
==================================================================
Management command: Generate face embeddings from the NADRA ID card dataset.

Usage
-----
    python manage.py generate_nadra_embeddings [options]

Options
-------
    --dataset-dir   Path to the Id_Card_Dataset folder (default: auto-detected)
    --output-dir    Where to store nadra_embeddings.pkl (default: face_verification/embeddings/)
    --batch-size    Process images in batches for progress reporting (default: 50)
    --force         Re-generate even if embeddings file already exists
    --limit         Process only the first N images (for testing)
    --dry-run       Show what would be processed without saving

Pipeline
--------
1. Scan the dataset directory for PNG/JPG images.
2. Map each image filename (e.g., 0001.png) to its CNIC via NADRARecord.face_image
   OR by loading NADRARecord objects that reference those images.
   If no DB mapping exists, the CNIC is derived from the image number.
3. For each image: detect face → generate embedding.
4. Store all embeddings in a dict keyed by CNIC.
5. Pickle-dump to disk.
6. Reset EmbeddingStore singleton so next request loads fresh data.

Note on Dataset Mapping
-----------------------
Since the Id_Card_Dataset images (0001.png ... 2000.png) are synthetic,
and NADRARecord rows may not exist for all of them, this command:
  - First tries to find a NADRARecord with a face_image matching this filename.
  - If not found, creates a synthetic mapping with a dummy CNIC for demo purposes.
  - In production, populate NADRARecord.face_image before running this command.
"""

import os
import pickle
import logging
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

logger = logging.getLogger('face_verification')


class Command(BaseCommand):
    help = (
        'Generate face embeddings from the NADRA Id_Card_Dataset and store '
        'them as a pickle file for fast in-memory verification.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dataset-dir',
            type=str,
            default=None,
            help='Path to the image dataset folder. Defaults to Id_Card_Dataset at project root.',
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default=None,
            help='Output directory for nadra_embeddings.pkl.',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Report progress every N images.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-generate embeddings even if output file already exists.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Process only the first N images (useful for quick testing).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate processing without saving any files.',
        )

    # ─────────────────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        # ── Resolve paths ────────────────────────────────────────────────
        project_root = settings.BASE_DIR.parent  # one level above backend/

        dataset_dir = options['dataset_dir'] or str(project_root / 'Id_Card_Dataset')
        output_dir  = options['output_dir'] or str(
            settings.BASE_DIR / 'face_verification' / 'embeddings'
        )
        output_path = os.path.join(output_dir, 'nadra_embeddings.pkl')

        batch_size = options['batch_size']
        force      = options['force']
        limit      = options['limit']
        dry_run    = options['dry_run']

        # ── Validate dataset dir ─────────────────────────────────────────
        if not os.path.isdir(dataset_dir):
            raise CommandError(
                f'Dataset directory not found: {dataset_dir}\n'
                'Please provide the correct path with --dataset-dir'
            )

        # ── Check if output already exists ───────────────────────────────
        if os.path.exists(output_path) and not force and not dry_run:
            self.stdout.write(self.style.WARNING(
                f'Embeddings file already exists: {output_path}\n'
                'Use --force to regenerate.'
            ))
            return

        # ── Collect image files ───────────────────────────────────────────
        image_exts = {'.png', '.jpg', '.jpeg', '.webp'}
        all_images = sorted([
            f for f in os.listdir(dataset_dir)
            if os.path.splitext(f)[1].lower() in image_exts
        ])

        if not all_images:
            raise CommandError(f'No image files found in: {dataset_dir}')

        if limit:
            all_images = all_images[:limit]

        total = len(all_images)
        self.stdout.write(self.style.HTTP_INFO(
            f'\nFound {total} images in: {dataset_dir}'
        ))

        # ── Load NADRA records for mapping ───────────────────────────────
        self.stdout.write('Loading NADRA records from database...')
        nadra_map = self._build_nadra_map(dataset_dir)
        self.stdout.write(f'   -> {len(nadra_map)} NADRA records loaded.\n')

        # ── Import face processor ─────────────────────────────────────────
        try:
            from face_verification.face_processor import extract_embedding_from_path
        except ImportError as exc:
            raise CommandError(f'Cannot import face_processor: {exc}')

        # ── Process images ───────────────────────────────────────────────
        embeddings = {}
        skipped    = 0
        errors     = 0

        self.stdout.write('Generating embeddings...\n')

        for i, filename in enumerate(all_images, start=1):
            image_path = os.path.join(dataset_dir, filename)

            # Map image to CNIC/person info
            record_info = nadra_map.get(filename)
            if record_info is None:
                # Create synthetic CNIC from filename for demo purposes
                num = int(os.path.splitext(filename)[0])
                record_info = {
                    'cnic': f'{num:013d}',          # 13-digit zero-padded
                    'full_name': f'Citizen {num:04d}',
                    'father_name': f'Father {num:04d}',
                    'image_path': filename,
                }

            cnic = record_info['cnic']

            try:
                embedding, meta = extract_embedding_from_path(
                    image_path, check_quality=False
                )
                embeddings[cnic] = {
                    'embedding':   embedding,
                    'full_name':   record_info['full_name'],
                    'father_name': record_info['father_name'],
                    'image_path':  filename,
                    'model_used':  meta.get('model_used', 'unknown'),
                }

            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.WARNING(
                    f'   [Skipping] {filename}: {exc}'
                ))
                continue

            # Progress report
            if i % batch_size == 0 or i == total:
                pct = (i / total) * 100
                self.stdout.write(
                    f'   [{i:>5}/{total}] {pct:>5.1f}%  '
                    f'Loaded {len(embeddings)} embedded  '
                    f'Failed {errors} errors'
                )

        # ── Save to disk ─────────────────────────────────────────────────
        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'\nDRY RUN complete. Would save {len(embeddings)} embeddings to:\n'
                f'   {output_path}'
            ))
            return

        if not embeddings:
            raise CommandError(
                'No embeddings were generated. '
                'Ensure face images are clear and face detection libraries are installed.'
            )

        # Create output dir if needed
        os.makedirs(output_dir, exist_ok=True)

        with open(output_path, 'wb') as f:
            pickle.dump(embeddings, f, protocol=pickle.HIGHEST_PROTOCOL)

        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)

        # ── Reset singleton so next request loads fresh data ─────────────
        try:
            from face_verification.embedding_store import EmbeddingStore
            EmbeddingStore.reset()
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f'Could not reset EmbeddingStore: {exc}'))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone!\n'
            f'   Embeddings generated : {len(embeddings)}\n'
            f'   Images skipped       : {total - len(embeddings) - errors}\n'
            f'   Errors               : {errors}\n'
            f'   Output file          : {output_path}\n'
            f'   File size            : {file_size_mb:.2f} MB\n'
            f'\n'
            f'The embedding store will load automatically on next server restart.\n'
            f'Or call EmbeddingStore.reset() to hot-reload without restarting.\n'
        ))

    # ─────────────────────────────────────────────────────────────────────

    def _build_nadra_map(self, dataset_dir: str) -> dict:
        """
        Build a mapping:  filename → {cnic, full_name, father_name, image_path}

        Priority:
        1. NADRARecord.face_image — if the field stores the filename or path
        2. Match by image number → sequential CNIC assignment from ordered records
        3. Fallback: synthetic CNIC (handled in main loop)
        """
        mapping = {}

        try:
            from nadra.models import NADRARecord

            # Strategy 1: face_image field contains the filename
            records = NADRARecord.objects.filter(is_active=True).order_by('id')
            for record in records:
                if record.face_image:
                    fname = os.path.basename(str(record.face_image))
                    mapping[fname] = {
                        'cnic':        record.cnic,
                        'full_name':   record.full_name,
                        'father_name': record.father_name,
                        'image_path':  fname,
                    }

            # Strategy 2: match records to sorted image files by position
            if len(mapping) < 10:  # few direct matches → use positional mapping
                image_files = sorted([
                    f for f in os.listdir(dataset_dir)
                    if os.path.splitext(f)[1].lower() in {'.png', '.jpg', '.jpeg'}
                ])
                for idx, (record, fname) in enumerate(
                    zip(records, image_files)
                ):
                    if fname not in mapping:
                        mapping[fname] = {
                            'cnic':        record.cnic,
                            'full_name':   record.full_name,
                            'father_name': record.father_name,
                            'image_path':  fname,
                        }

        except Exception as exc:
            self.stdout.write(self.style.WARNING(
                f'   Could not load NADRARecord mapping: {exc}'
            ))

        return mapping
