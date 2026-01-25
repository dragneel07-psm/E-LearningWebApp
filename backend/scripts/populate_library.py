import os
import sys
import django
import random

# Add project root to path
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models.tenant import Tenant
from core.middleware.tenant import _thread_locals
from library.models import Book

def populate_library():
    print("🚀 Starting Library Population...")

    # 1. Get Tenant
    try:
        tenant = Tenant.objects.get(subdomain='demo')
        print(f"✅ Found tenant: {tenant.name}")
    except Tenant.DoesNotExist:
        print("❌ Demo tenant not found! Run setup_test_accounts.py first.")
        return

    # 1b. Register Database Connection
    from django.conf import settings
    from django.db import connections
    
    if tenant.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES['default'].copy()
        new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
        settings.DATABASES[tenant.db_alias] = new_db_config
        connections.databases[tenant.db_alias] = new_db_config
        print(f"✅ Registered dynamic database: {tenant.db_alias} -> {tenant.db_name}")

    # 2. Set Context
    _thread_locals.tenant = tenant
    _thread_locals.db_alias = tenant.db_alias
    
    print(f"📚 Populating books in database: {tenant.db_alias}...")

    # 3. Sample Books Data
    books_data = [
        {
            "title": "The Great Gatsby",
            "author": "F. Scott Fitzgerald",
            "category": "fiction",
            "isbn": "978-0743273565",
            "publisher": "Scribner",
            "published_year": 1925,
            "description": "A novel set in the Jazz Age that tells the story of Jay Gatsby's unrequited love for Daisy Buchanan.",
            "total_copies": 5
        },
        {
            "title": "1984",
            "author": "George Orwell",
            "category": "fiction",
            "isbn": "978-0451524935",
            "publisher": "Signet Classic",
            "published_year": 1949,
            "description": "A dystopian social science fiction novel and cautionary tale about the future.",
            "total_copies": 8
        },
        {
            "title": "A Brief History of Time",
            "author": "Stephen Hawking",
            "category": "science",
            "isbn": "978-0553380163",
            "publisher": "Bantam",
            "published_year": 1988,
            "description": "Explains concepts in cosmology, including the Big Bang, black holes, and light cones.",
            "total_copies": 3
        },
        {
            "title": "Sapiens: A Brief History of Humankind",
            "author": "Yuval Noah Harari",
            "category": "history",
            "isbn": "978-0062316097",
            "publisher": "Harper",
            "published_year": 2015,
            "description": "A book that surveys the history of humankind from the Stone Age to the twenty-first century.",
            "total_copies": 6
        },
        {
            "title": "Introduction to Algorithms",
            "author": "Thomas H. Cormen",
            "category": "technology",
            "isbn": "978-0262033848",
            "publisher": "MIT Press",
            "published_year": 2009,
            "description": "A comprehensive textbook on computer algorithms.",
            "total_copies": 10
        },
        {
            "title": "Clean Code",
            "author": "Robert C. Martin",
            "category": "technology",
            "isbn": "978-0132350884",
            "publisher": "Prentice Hall",
            "published_year": 2008,
            "description": "A handbook of agile software craftsmanship.",
            "total_copies": 7
        },
        {
            "title": "To Kill a Mockingbird",
            "author": "Harper Lee",
            "category": "fiction",
            "isbn": "978-0060935467",
            "publisher": "Harper Perennial",
            "published_year": 1960,
            "description": "A novel about the serious issues of rape and racial inequality.",
            "total_copies": 6
        },
        {
            "title": "The Feynman Lectures on Physics",
            "author": "Richard P. Feynman",
            "category": "science",
            "isbn": "978-0465024940",
            "publisher": "Basic Books",
            "published_year": 1964,
            "description": "A physics textbook based on lectures by Richard Feynman.",
            "total_copies": 4
        },
        {
            "title": "Steve Jobs",
            "author": "Walter Isaacson",
            "category": "biography",
            "isbn": "978-1451648539",
            "publisher": "Simon & Schuster",
            "published_year": 2011,
            "description": "The authorized biography of Steve Jobs.",
            "total_copies": 4
        },
        {
            "title": "The Pragmatic Programmer",
            "author": "Andrew Hunt",
            "category": "technology",
            "isbn": "978-0201616224",
            "publisher": "Addison-Wesley",
            "published_year": 1999,
            "description": "A book about software engineering.",
            "total_copies": 5
        },
         {
            "title": "Cosmos",
            "author": "Carl Sagan",
            "category": "science",
            "isbn": "978-0345331359",
            "publisher": "Ballantine Books",
            "published_year": 1980,
            "description": "Explores the mutual development of science and civilization.",
            "total_copies": 4
        },
        {
            "title": "Calculus",
            "author": "James Stewart",
            "category": "mathematics",
            "isbn": "978-1285740621",
            "publisher": "Cengage Learning",
            "published_year": 2015,
            "description": "A standard calculus textbook.",
            "total_copies": 8
        },
         {
            "title": "Guns, Germs, and Steel",
            "author": "Jared Diamond",
            "category": "history",
            "isbn": "978-0393317558",
            "publisher": "W. W. Norton",
            "published_year": 1997,
            "description": "A transdisciplinary non-fiction book.",
            "total_copies": 3
        },
        {
            "title": "Designing Data-Intensive Applications",
            "author": "Martin Kleppmann",
            "category": "technology",
            "isbn": "978-1449373320",
            "publisher": "O'Reilly Media",
            "published_year": 2017,
            "description": "The big ideas behind reliable, scalable, and maintainable systems.",
            "total_copies": 6
        },
        {
            "title": "Becoming",
            "author": "Michelle Obama",
            "category": "biography",
            "isbn": "978-1524763138",
            "publisher": "Crown",
            "published_year": 2018,
            "description": "The memoir of former First Lady Michelle Obama.",
            "total_copies": 5
        }

    ]

    # 4. Insert Data
    count = 0
    for data in books_data:
        # Check if exists
        exists = Book.objects.using(tenant.db_alias).filter(isbn=data['isbn']).exists()
        if not exists:
            # Set available equal to total initially
            data['available_copies'] = data['total_copies']
            
            # Choose a random cover color placeholder if we had image generation
            # data['cover_image'] = f"https://placehold.co/400x600?text={data['title'].replace(' ', '+')}"
            
            Book.objects.using(tenant.db_alias).create(**data)
            print(f"   + Added: {data['title']}")
            count += 1
        else:
            print(f"   . Skipped (Exists): {data['title']}")

    print(f"\n✅ Population Complete! Added {count} new books.")

if __name__ == '__main__':
    populate_library()
