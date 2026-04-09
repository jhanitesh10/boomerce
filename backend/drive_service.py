import re
import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class DriveService:
    def __init__(self):
        creds_json = os.getenv("GOOGLE_DRIVE_CREDENTIALS")
        if not creds_json:
            self.service = None
            print("Drive Service: GOOGLE_DRIVE_CREDENTIALS not set.")
            return
        
        try:
            info = json.loads(creds_json)
            # Support both Service Account and Web Client strings (though Service Account is required for automation)
            if info.get('web'):
                print("Drive Service WARNING: Detected 'web' client key. Service Account key is required for automated backend tasks.")
            
            self.creds = service_account.Credentials.from_service_account_info(
                info, scopes=['https://www.googleapis.com/auth/drive']
            )
            self.service = build('drive', 'v3', credentials=self.creds)
        except Exception as e:
            print(f"Failed to initialize Drive Service: {e}")
            self.service = None

    def sanitize_name(self, name):
        if not name: return ""
        # 1. Lowercase
        s = name.strip().lower()
        # 2. Keep only a-z, 0-9, spaces, underscores, and dots (important for filenames)
        s = re.sub(r'[^a-z0-9\s_\.]', '', s)
        # 3. Replace one or more spaces/white-space with a single underscore
        s = re.sub(r'\s+', '_', s)
        return s or "unnamed"

    def get_or_create_folder(self, name, parent_id):
        if not self.service:
            raise ValueError("Drive Service is not initialized. Please check GOOGLE_DRIVE_CREDENTIALS.")
        
        try:
            name = self.sanitize_name(name)
            if not name: 
                # Fallback for completely empty/invalid names after sanitization
                name = "unnamed_folder"

            # Escape single quotes in folder names
            safe_name = name.replace("'", "\\'")
            query = f"name = '{safe_name}' and '{parent_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            results = self.service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
            items = results.get('files', [])

            if items:
                return items[0]['id']
            
            # Create if not exists
            file_metadata = {
                'name': name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }
            file = self.service.files().create(body=file_metadata, fields='id').execute()
            return file.get('id')
        except HttpError as error:
            print(f"An error occurred in get_or_create_folder: {error}")
            raise error

    def create_sku_folder_structure(self, brand, category, sub_category, sku_code):
        root_id = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "root")

        try:
            # Brand folder created directly in root
            brand_id = self.get_or_create_folder(brand or "Unknown Brand", root_id)
            
            # category folder
            category_id = self.get_or_create_folder(category or "Unknown Category", brand_id)
            
            # subcategory folder
            subcat_id = self.get_or_create_folder(sub_category or "General", category_id)
            
            # sku folder
            sku_folder_id = self.get_or_create_folder(sku_code, subcat_id)

            # Return the web view link
            folder = self.service.files().get(fileId=sku_folder_id, fields='webViewLink').execute()
            return folder.get('webViewLink')
        except Exception as e:
            print(f"Error creating SKU folder structure: {e}")
            raise e
    def trash_folder(self, folder_url):
        if not self.service or not folder_url:
            return False
        
        try:
            folder_id = self.get_id_from_url(folder_url)
            if not folder_id:
                return False
            
            # Move to trash
            self.service.files().update(fileId=folder_id, body={'trashed': True}).execute()
            return True
        except Exception as e:
            print(f"Error trashing folder: {e}")
            return False

    def get_id_from_url(self, url):
        if not url: return None
        # Extract ID from URL
        # Format: https://drive.google.com/drive/folders/ID
        match = re.search(r'folders/([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
        # Handle open?id=... format
        match = re.search(r'id=([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
        return None

    def list_files_in_folder(self, folder_id):
        if not self.service or not folder_id:
            return []
        
        try:
            # Query: folder_id in parents, not trashed, not a folder
            query = f"'{folder_id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'"
            results = self.service.files().list(
                q=query, 
                spaces='drive', 
                fields='files(id, name, mimeType, size)',
                pageSize=500
            ).execute()
            return results.get('files', [])
        except Exception as e:
            print(f"Error listing files in folder {folder_id}: {e}")
            return []

    def get_file_content(self, file_id):
        if not self.service or not file_id:
            return None
        
        try:
            return self.service.files().get_media(fileId=file_id).execute()
        except Exception as e:
            print(f"Error fetching file content {file_id}: {e}")
            return None
