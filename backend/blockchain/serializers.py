from rest_framework import serializers
from .models import BlockchainBlock


class BlockchainBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BlockchainBlock
        fields = [
            'id', 'block_index', 'timestamp', 'previous_hash',
            'current_hash', 'data_hash', 'action_type', 'action_type_display',
            'record_id', 'performed_by', 'nonce', 'payload_json',
        ]

    action_type_display = serializers.CharField(
        source='get_action_type_display', read_only=True
    )


class ChainVerifySerializer(serializers.Serializer):
    valid        = serializers.BooleanField()
    total_blocks = serializers.IntegerField()
    issues       = serializers.ListField(child=serializers.CharField())
