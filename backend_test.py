import requests
import sys
import base64
import io
from PIL import Image
from datetime import datetime
import time

class PhotoPersonalizationTester:
    def __init__(self, base_url="https://magic-portrait-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_photo_id = None
        self.personalized_image_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=60)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=60)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_image(self):
        """Create a simple test image"""
        # Create a simple colored image
        img = Image.new('RGB', (300, 300), color='lightblue')
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        return img_bytes.getvalue()

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_upload_photo(self):
        """Test photo upload"""
        test_image = self.create_test_image()
        
        files = {
            'file': ('test_child.jpg', test_image, 'image/jpeg')
        }
        
        success, response = self.run_test(
            "Upload Photo",
            "POST",
            "upload",
            200,
            files=files
        )
        
        if success and 'id' in response:
            self.uploaded_photo_id = response['id']
            print(f"   Photo ID: {self.uploaded_photo_id}")
            print(f"   Has face: {response.get('has_face', 'Unknown')}")
            return True
        return False

    def test_upload_invalid_file(self):
        """Test upload with invalid file type"""
        files = {
            'file': ('test.txt', b'This is not an image', 'text/plain')
        }
        
        success, response = self.run_test(
            "Upload Invalid File",
            "POST",
            "upload",
            400,
            files=files
        )
        return success

    def test_generate_personalized_image(self):
        """Test AI image generation"""
        if not self.uploaded_photo_id:
            print("❌ Cannot test generation - no uploaded photo")
            return False

        data = {
            "photo_id": self.uploaded_photo_id,
            "prompt": "Transform this child into a whimsical illustrated character with big expressive eyes, soft features, wearing a floral dress with a pink flower headband, in a cute cartoon style with pastel colors and a warm, playful atmosphere"
        }
        
        print("   ⏳ Generating image (this may take 10-30 seconds)...")
        success, response = self.run_test(
            "Generate Personalized Image",
            "POST",
            "generate",
            200,
            data=data
        )
        
        if success and 'id' in response:
            self.personalized_image_id = response['id']
            print(f"   Generated Image ID: {self.personalized_image_id}")
            print(f"   Template: {response.get('template_used', 'Unknown')}")
            
            # Check if image data is present
            if 'personalized_image' in response:
                image_data = response['personalized_image']
                print(f"   Image data length: {len(image_data)} characters")
                
                # Validate base64 format
                try:
                    base64.b64decode(image_data)
                    print("   ✅ Valid base64 image data")
                except:
                    print("   ❌ Invalid base64 image data")
                    return False
            
            return True
        return False

    def test_generate_without_photo(self):
        """Test generation with invalid photo ID"""
        data = {
            "photo_id": "invalid-id",
            "prompt": "Test prompt"
        }
        
        success, response = self.run_test(
            "Generate with Invalid Photo ID",
            "POST",
            "generate",
            404,
            data=data
        )
        return success

    def test_get_gallery(self):
        """Test gallery endpoint"""
        success, response = self.run_test(
            "Get Gallery",
            "GET",
            "gallery",
            200
        )
        
        if success:
            if isinstance(response, list):
                print(f"   Gallery items: {len(response)}")
                if len(response) > 0:
                    print(f"   First item keys: {list(response[0].keys())}")
                return True
            else:
                print("   ❌ Gallery response is not a list")
                return False
        return False

    def test_get_personalized_image(self):
        """Test getting specific personalized image"""
        if not self.personalized_image_id:
            print("❌ Cannot test get personalized image - no generated image")
            return False

        success, response = self.run_test(
            "Get Personalized Image",
            "GET",
            f"personalized/{self.personalized_image_id}",
            200
        )
        
        if success and 'personalized_image' in response:
            print(f"   Retrieved image for ID: {self.personalized_image_id}")
            return True
        return False

    def test_get_nonexistent_image(self):
        """Test getting non-existent personalized image"""
        success, response = self.run_test(
            "Get Non-existent Image",
            "GET",
            "personalized/invalid-id",
            404
        )
        return success

def main():
    print("🚀 Starting Photo Personalization API Tests")
    print("=" * 60)
    
    tester = PhotoPersonalizationTester()
    
    # Test sequence
    tests = [
        ("API Root", tester.test_api_root),
        ("Upload Photo", tester.test_upload_photo),
        ("Upload Invalid File", tester.test_upload_invalid_file),
        ("Generate Personalized Image", tester.test_generate_personalized_image),
        ("Generate with Invalid Photo", tester.test_generate_without_photo),
        ("Get Gallery", tester.test_get_gallery),
        ("Get Personalized Image", tester.test_get_personalized_image),
        ("Get Non-existent Image", tester.test_get_nonexistent_image),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            tester.tests_run += 1
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
