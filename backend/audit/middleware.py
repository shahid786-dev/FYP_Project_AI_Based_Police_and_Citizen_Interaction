from .models import AuditLog

SKIP_PATHS = ['/api/docs/', '/api/schema/', '/admin/', '/static/', '/media/']

class AuditLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Skip non-API and static paths
        if any(request.path.startswith(p) for p in SKIP_PATHS):
            return response

        # Only log write operations or important reads
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] or '/verify' in request.path:
            try:
                user = request.user if request.user.is_authenticated else None
                ip = self._get_client_ip(request)
                action = f"{request.method} {request.path}"

                AuditLog.objects.create(
                    user=user,
                    action=action,
                    endpoint=request.path,
                    method=request.method,
                    ip_address=ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    status_code=response.status_code
                )
            except Exception:
                pass  # Never crash the request on audit failure

        return response

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
