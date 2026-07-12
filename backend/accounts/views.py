from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserSerializer

class CurrentUserView(APIView):
    """
    API endpoint that returns the details of the currently authenticated user.
    Requires a valid authentication token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        """
        Update the current user's profile details (first_name, last_name).
        """
        data = {}
        if 'first_name' in request.data:
            data['first_name'] = request.data['first_name']
        if 'last_name' in request.data:
            data['last_name'] = request.data['last_name']
            
        if not data:
            return Response({'detail': 'No valid fields provided for update.'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = UserSerializer(request.user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
