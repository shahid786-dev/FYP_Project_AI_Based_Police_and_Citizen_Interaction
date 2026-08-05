from django.contrib import admin
from .models import FaqKnowledge

@admin.register(FaqKnowledge)
class FaqKnowledgeAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'created_at')
    list_filter = ('category',)
    search_fields = ('question', 'answer')
