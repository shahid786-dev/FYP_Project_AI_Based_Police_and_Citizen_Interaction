from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import BlockchainBlock
from .serializers import BlockchainBlockSerializer, ChainVerifySerializer
from .service import BlockchainService


class BlockPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class BlockchainBlockListView(generics.ListAPIView):
    """
    GET /api/blockchain/blocks/
    List all blockchain blocks (paginated, newest first).
    Public read access so the explorer page can work without login.
    """
    serializer_class    = BlockchainBlockSerializer
    pagination_class    = BlockPagination
    permission_classes  = [permissions.AllowAny]
    queryset            = BlockchainBlock.objects.all().order_by('-block_index')

    def get_queryset(self):
        qs = super().get_queryset()
        action = self.request.query_params.get('action_type')
        if action:
            qs = qs.filter(action_type=action)
        return qs


class BlockchainBlockDetailView(generics.RetrieveAPIView):
    """GET /api/blockchain/blocks/<id>/"""
    serializer_class   = BlockchainBlockSerializer
    permission_classes = [permissions.AllowAny]
    queryset           = BlockchainBlock.objects.all()


class BlockchainVerifyView(APIView):
    """
    GET /api/blockchain/verify/
    Verify the entire chain integrity.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        result = BlockchainService.verify_chain()
        return Response(result)


class BlockchainRecordHistoryView(APIView):
    """
    GET /api/blockchain/record/<record_id>/
    Return all blocks associated with a specific application/record.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, record_id):
        blocks = BlockchainService.get_record_history(record_id)
        serializer = BlockchainBlockSerializer(blocks, many=True)
        return Response({'count': blocks.count(), 'blocks': serializer.data})
