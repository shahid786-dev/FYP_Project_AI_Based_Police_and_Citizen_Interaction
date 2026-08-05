from django.db import models

class FaqKnowledge(models.Model):
    question = models.TextField()
    answer = models.TextField()
    category = models.CharField(max_length=50, default='general')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question[:60]
