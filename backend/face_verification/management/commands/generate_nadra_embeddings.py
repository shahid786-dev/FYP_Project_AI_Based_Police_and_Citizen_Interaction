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
import re
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

        # ── Collect image files (prioritizing named cards first) ──────────
        image_exts = {'.png', '.jpg', '.jpeg', '.webp'}
        raw_images = [
            f for f in os.listdir(dataset_dir)
            if os.path.splitext(f)[1].lower() in image_exts
        ]

        # Prioritize named files (e.g., Shahid58.png, Tahir76.png) at the front
        named_images = sorted([f for f in raw_images if not f.startswith(('0','1','2','3','4','5','6','7','8','9'))], key=lambda x: x.lower())
        numbered_images = sorted([f for f in raw_images if f.startswith(('0','1','2','3','4','5','6','7','8','9'))])
        all_images = named_images + numbered_images

        if not all_images:
            raise CommandError(f'No image files found in: {dataset_dir}')

        if limit:
            # Ensure named images are always kept even with --limit
            all_images = named_images + numbered_images[:max(0, limit - len(named_images))]

        total = len(all_images)
        self.stdout.write(self.style.HTTP_INFO(
            f'\nFound {total} images in: {dataset_dir} (Named cards prioritized at top)'
        ))

        # ── Load NADRA records & registered citizen users ─────────────────
        self.stdout.write('Loading NADRA records & citizen users from database...')
        nadra_map = self._build_nadra_map(dataset_dir)

        # Get active citizen users to map their CNICs directly
        from django.contrib.auth import get_user_model
        User = get_user_model()
        citizen_cnic_map = {}
        for u in User.objects.all():
            if u.cnic:
                lname = (u.full_name or '').lower()
                if 'shahid' in lname:
                    citizen_cnic_map['shahid58.png'] = u.cnic
                elif 'tahir' in lname:
                    citizen_cnic_map['tahir76.png'] = u.cnic
                elif 'zulqarnain' in lname or 'zameer' in lname:
                    citizen_cnic_map['zulqarnain48.png'] = u.cnic

        self.stdout.write(f'   -> {len(nadra_map)} NADRA records & {len(citizen_cnic_map)} user CNIC mappings loaded.\n')

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
                # ── Special named identity cards ────────────────────────────
                NAMED_CARD_MAP = {
                    'tahir76.png':       {'cnic': '35202-7600001-1', 'full_name': 'Tahir Hussain',        'father_name': 'Muhammad Hussain'},
                    'shahid58.png':      {'cnic': '35202-5800002-3', 'full_name': 'Shahid Ali',           'father_name': 'Ali Ahmad'},
                    'zulqarnain48.png':  {'cnic': '35202-4800003-5', 'full_name': 'Zulqarnain Ahmed',     'father_name': 'Ahmed Zaman'},
                    # 9 newly added identity cards
                    'mudasirali.png':    {'cnic': '42301-1000001-1', 'full_name': 'Mudasir Ali',          'father_name': 'Ali Muhammad'},
                    'mudasirshah.png':   {'cnic': '42301-1000002-2', 'full_name': 'Mudasir Shah',         'father_name': 'Shah Muhammad'},
                    'hamid.png':         {'cnic': '42301-1000003-3', 'full_name': 'Hamid Khan',           'father_name': 'Amir Khan'},
                    'siraj.png':         {'cnic': '42301-1000004-4', 'full_name': 'Siraj ul Haq',         'father_name': 'Haq Nawaz'},
                    'karan.png':         {'cnic': '42301-1000005-5', 'full_name': 'Karan Das',            'father_name': 'Roshan Das'},
                    'haroon.png':        {'cnic': '42301-1000006-6', 'full_name': 'Haroon Rashid',        'father_name': 'Abdul Rashid'},
                    'abdulmutali.png':   {'cnic': '42301-1000007-7', 'full_name': 'Abdul Mutali',         'father_name': 'Ghulam Mutali'},
                    'eman.png':          {'cnic': '42301-1000008-8', 'full_name': 'Eman Fatima',          'father_name': 'Fateh Muhammad'},
                    'farhan.png':        {'cnic': '42301-1000009-9', 'full_name': 'Farhan Iqbal',         'father_name': 'Iqbal Ahmed'},
                }
                lower_fname = filename.lower()
                if lower_fname in NAMED_CARD_MAP:
                    info = NAMED_CARD_MAP[lower_fname]
                    record_info = {
                        'cnic':        info['cnic'],
                        'full_name':   info['full_name'],
                        'father_name': info['father_name'],
                        'image_path':  filename,
                    }
                else:
                    # Generic synthetic CNIC from filename number for demo purposes
                    num = int(os.path.splitext(filename)[0]) if os.path.splitext(filename)[0].isdigit() else hash(filename) % 9999999
                    record_info = {
                        'cnic': f'{num:013d}',
                        'full_name': f'Citizen {num:04d}',
                        'father_name': f'Father {num:04d}',
                        'image_path': filename,
                    }

            cnic = record_info['cnic']

            try:
                embedding, meta = extract_embedding_from_path(
                    image_path, check_quality=False
                )
                entry = {
                    'embedding':   embedding,
                    'full_name':   record_info['full_name'],
                    'father_name': record_info['father_name'],
                    'image_path':  filename,
                    'model_used':  meta.get('model_used', 'unknown'),
                }
                embeddings[cnic] = entry

                # If this is a named card, ALSO store under any matching registered user CNIC!
                lower_fname = filename.lower()
                if lower_fname in citizen_cnic_map:
                    user_cnic = citizen_cnic_map[lower_fname]
                    if user_cnic != cnic:
                        embeddings[user_cnic] = entry.copy()
                        embeddings[user_cnic]['cnic'] = user_cnic

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
        1. Identity card CSV (Id_Card_Dataset_Text/identity_card_cnic_dataset.csv)
           — rows with ocr_status=success and a non-empty cnic are used first.
        2. NADRARecord.face_image — if the field stores the filename or path.
        3. Match by image number → sequential CNIC assignment from ordered records.
        4. Fallback: synthetic CNIC (handled in main loop).
        """
        import csv as _csv
        mapping = {}

        # ── Strategy 1: CSV-based CNIC lookup (primary source) ────────────
        # The CSV at Id_Card_Dataset_Text/identity_card_cnic_dataset.csv maps
        # image filenames to CNICs that were extracted via OCR.
        # Only rows with ocr_status=success and a non-empty cnic are used.
        project_root = settings.BASE_DIR.parent  # one level above backend/
        csv_path = os.path.join(
            str(project_root),
            'Id_Card_Dataset_Text',
            'identity_card_cnic_dataset.csv',
        )

        def _normalize_cnic(raw: str) -> str:
            """Strip whitespace/dashes/spaces for comparison; keep original for storage."""
            return re.sub(r'[^\d]', '', raw.strip())

        if os.path.isfile(csv_path):
            try:
                with open(csv_path, newline='', encoding='utf-8-sig') as f:
                    reader = _csv.DictReader(f)
                    csv_rows_loaded = 0
                    for row in reader:
                        ocr_status = row.get('ocr_status', '').strip().lower()
                        raw_cnic   = row.get('cnic', '').strip()
                        img_fname  = row.get('image_filename', '').strip()

                        if ocr_status != 'success' or not raw_cnic or not img_fname:
                            continue  # skip failed-OCR or empty rows

                        # Normalise CNIC: use as-is if already formatted XXXXX-XXXXXXX-X,
                        # otherwise keep the raw string from the CSV (do NOT mutate)
                        stored_cnic = raw_cnic  # preserve original formatting

                        mapping[img_fname] = {
                            'cnic':        stored_cnic,
                            'full_name':   f'Citizen ({stored_cnic})',
                            'father_name': 'N/A',
                            'image_path':  img_fname,
                        }
                        csv_rows_loaded += 1

                self.stdout.write(
                    f'   -> CSV CNIC source: {csv_rows_loaded} entries loaded from {csv_path}'
                )
            except Exception as exc:
                self.stdout.write(self.style.WARNING(
                    f'   Could not read identity card CSV: {exc}'
                ))
        else:
            self.stdout.write(self.style.WARNING(
                f'   Identity card CSV not found at {csv_path} — falling back to DB/synthetic mapping.'
            ))

        # ── Strategy 2 & 3: NADRARecord DB (fills any gaps not covered by CSV) ─
        try:
            from nadra.models import NADRARecord

            records = NADRARecord.objects.filter(is_active=True).order_by('id')

            # Strategy 2: face_image field contains the filename
            for record in records:
                if record.face_image:
                    fname = os.path.basename(str(record.face_image))
                    if fname not in mapping:  # CSV takes priority
                        mapping[fname] = {
                            'cnic':        record.cnic,
                            'full_name':   record.full_name,
                            'father_name': record.father_name,
                            'image_path':  fname,
                        }

            # Strategy 3: positional mapping (only if very few CSV/DB matches)
            if len(mapping) < 10:
                image_files = sorted([
                    f for f in os.listdir(dataset_dir)
                    if os.path.splitext(f)[1].lower() in {'.png', '.jpg', '.jpeg'}
                ])
                for record, fname in zip(records, image_files):
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
