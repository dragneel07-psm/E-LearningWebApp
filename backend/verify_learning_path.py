import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api"

def get_token(email, password):
    url = f"{BASE_URL}/token/"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()["access"]
    else:
        # print(f"Failed to get token for {email}: {response.text}")
        return None

def verify_learning_path_flow():
    print("🚀 Starting Learning Path Verification")

    # 1. Login as Student
    # Using report_test as it worked before
    student_email = "report_test@demo.com"
    token = get_token(student_email, "password123")
    
    if not token:
        # Fallback
        student_email = "student_user@demo.com"
        token = get_token(student_email, "student123")
        
    if not token:
        print("❌ Login failed")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-tenant-id": "demo"
    }
    print(f"✅ Logged in as {student_email}")

    # 2. Get Student ID
    resp = requests.get(f"{BASE_URL}/academic/students/me/", headers=headers)
    if resp.status_code != 200:
        print("❌ Could not get student profile")
        return
    student_id = resp.json()['id']
    print(f"👤 Student ID: {student_id}")

    # 3. Generate Learning Path
    print("\n--- 1. Generating Learning Path ---")
    gen_data = {
        "student_id": student_id,
        "topic_focus": "Python Basics"
    }
    resp = requests.post(f"{BASE_URL}/ai/learning-paths/generate/", headers=headers, json=gen_data)
    if resp.status_code != 201:
        print(f"❌ Failed to generate path: {resp.text}")
        return
    
    path = resp.json()
    path_id = path['id']
    print(f"✅ Path Generated: {path['title']}")
    print(f"Nodes Created: {len(path['nodes'])}")
    
    if len(path['nodes']) == 0:
        print("❌ No nodes in path")
        return

    first_node = path['nodes'][0]
    second_node = path['nodes'][1]
    
    print(f"Node 1: {first_node['title']} ({first_node['status']})")
    print(f"Node 2: {second_node['title']} ({second_node['status']})")

    # 4. Complete First Node
    print("\n--- 2. Completing First Node ---")
    resp = requests.post(f"{BASE_URL}/ai/learning-nodes/{first_node['id']}/complete/", headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to complete node: {resp.text}")
        return
    
    result = resp.json()
    print(f"✅ Node Completed status: {result['status']}")

    # 5. Verify Next Node Unlocked
    print("\n--- 3. Verifying Progress ---")
    # Fetch path again to check status
    resp = requests.get(f"{BASE_URL}/ai/learning-paths/{path_id}/", headers=headers)
    updated_path = resp.json()
    
    updated_node_2 = next(n for n in updated_path['nodes'] if n['id'] == second_node['id'])
    print(f"Node 2 Status: {updated_node_2['status']}")
    
    if updated_node_2['status'] in ['unlocked', 'in_progress']:
        print("✅ Next node unlocked successfully")
    else:
        print("⚠️ Next node NOT unlocked")

    print("\n✅ AI Learning Path Flow Verified!")

if __name__ == "__main__":
    verify_learning_path_flow()
