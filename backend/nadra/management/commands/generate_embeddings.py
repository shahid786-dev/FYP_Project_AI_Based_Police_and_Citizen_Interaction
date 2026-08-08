import os
import json
from django.core.management.base import BaseCommand
from nadra.models import NADRARecord
from django.conf import settings
from deepface import DeepFace

class Command(BaseCommand):
    help = 'Generates facial embeddings for NADRA records using DeepFace'

    def handle(self, *args, **options):
        records = NADRARecord.objects.filter(face_image__isnull=False).exclude(face_image='')
        count = 0
        self.stdout.write("Generating embeddings for NADRA records...")
        for record in records:
            if not record.face_embedding:
                try:
                    img_path = record.face_image.path
                    if os.path.exists(img_path):
                        # Generate embedding using Facenet (good balance of size and accuracy)
                        embedding = DeepFace.represent(img_path, model_name='Facenet', enforce_detection=False)
                        
                        # represent() returns a list of dictionaries if multiple faces, we take the first
                        if isinstance(embedding, list) and len(embedding) > 0:
                            emb_vector = embedding[0]["embedding"]
                            record.face_embedding = emb_vector
                            record.save()
                            count += 1
                            self.stdout.write(self.style.SUCCESS(f"Generated embedding for {record.cnic}"))
                        else:
                            self.stdout.write(self.style.WARNING(f"No face found for {record.cnic}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error for {record.cnic}: {str(e)}"))
            else:
                self.stdout.write(f"Embedding already exists for {record.cnic}")

        self.stdout.write(self.style.SUCCESS(f"Completed! Generated {count} embeddings."))
