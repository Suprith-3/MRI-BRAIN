import io
import unittest
from PIL import Image
from app import create_app

class NeuroScanAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_health_endpoint(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertIn('healthy', response.get_json()['status'])

    def test_analyze_without_auth_or_file(self):
        # Missing file
        response = self.client.post('/api/prediction/analyze')
        self.assertEqual(response.status_code, 400)

    def test_analyze_valid_mock_image(self):
        # Create a mock 224x224 grayscale/RGB MRI image
        img_byte_arr = io.BytesIO()
        image = Image.new('RGB', (224, 224), color='black')
        image.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)

        response = self.client.post(
            '/api/prediction/analyze',
            data={'image': (img_byte_arr, 'test_mri.jpg')},
            content_type='multipart/form-data',
            headers={'Authorization': 'Bearer mock-test-token'}
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertIn('prediction', data)
        self.assertIn('class', data['prediction'])
        self.assertIn('probabilities', data['prediction'])

if __name__ == '__main__':
    unittest.main()
