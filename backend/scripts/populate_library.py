#!/usr/bin/env python
"""
Populate library with sample books for demo
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from library.models import Book
from core.models import Tenant

# Get the demo tenant
tenant = Tenant.objects.get(domain_url='localhost')

# Sample books data
books = [
    # Computer Science & Technology
    {
        "title": "Introduction to Algorithms",
        "author": "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
        "isbn": "9780262033848",
        "category": "technology",
        "publisher": "MIT Press",
        "published_year": 2009,
        "total_copies": 3,
        "available_copies": 3,
        "description": "A comprehensive textbook on computer algorithms covering algorithm design and analysis.",
    },
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "isbn": "9780132350884",
        "category": "technology",
        "publisher": "Prentice Hall",
        "published_year": 2008,
        "total_copies": 2,
        "available_copies": 2,
        "description": "A handbook of agile software craftsmanship and best practices for writing clean code.",
    },
    {
        "title": "Design Patterns",
        "author": "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
        "isbn": "9780201633612",
        "category": "technology",
        "publisher": "Addison-Wesley",
        "published_year": 1994,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Elements of reusable object-oriented software design patterns.",
    },
    
    # Science
    {
        "title": "A Brief History of Time",
        "author": "Stephen Hawking",
        "isbn": "9780553380163",
        "category": "science",
        "publisher": "Bantam",
        "published_year": 1988,
        "total_copies": 3,
        "available_copies": 3,
        "description": "From the Big Bang to black holes - a journey through space and time.",
    },
    {
        "title": "The Selfish Gene",
        "author": "Richard Dawkins",
        "isbn": "9780199291151",
        "category": "science",
        "publisher": "Oxford University Press",
        "published_year": 1976,
        "total_copies": 2,
        "available_copies": 2,
        "description": "A gene-centered view of evolution and natural selection.",
    },
    {
        "title": "Cosmos",
        "author": "Carl Sagan",
        "isbn": "9780345331359",
        "category": "science",
        "publisher": "Random House",
        "published_year": 1980,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Personal voyage through space and time exploring the universe.",
    },
    
    # Mathematics
    {
        "title": "Calculus",
        "author": "James Stewart",
        "isbn": "9781285740621",
        "category": "mathematics",
        "publisher": "Cengage Learning",
        "published_year": 2015,
        "total_copies": 4,
        "available_copies": 4,
        "description": "Early transcendentals - comprehensive calculus textbook.",
    },
    {
        "title": "Linear Algebra and Its Applications",
        "author": "David C. Lay",
        "isbn": "9780321982384",
        "category": "mathematics",
        "publisher": "Pearson",
        "published_year": 2015,
        "total_copies": 3,
        "available_copies": 3,
        "description": "Contemporary approach to linear algebra with applications.",
    },
    
    # Fiction
    {
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "isbn": "9780061120084",
        "category": "fiction",
        "publisher": "Harper Perennial",
        "published_year": 1960,
        "total_copies": 3,
        "available_copies": 3,
        "description": "A classic of modern American literature set in the Deep South.",
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "isbn": "9780451524935",
        "category": "fiction",
        "publisher": "Signet Classic",
        "published_year": 1949,
        "total_copies": 3,
        "available_copies": 3,
        "description": "A dystopian social science fiction novel and cautionary tale.",
    },
    {
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "isbn": "9780141439518",
        "category": "fiction",
        "publisher": "Penguin Classics",
        "published_year": 1813,
        "total_copies": 2,
        "available_copies": 2,
        "description": "A romantic novel of manners in Georgian England.",
    },
    
    # History
    {
        "title": "Sapiens: A Brief History of Humankind",
        "author": "Yuval Noah Harari",
        "isbn": "9780062316110",
        "category": "history",
        "publisher": "Harper",
        "published_year": 2015,
        "total_copies": 3,
        "available_copies": 3,
        "description": "The history of humankind from the Stone Age to the modern age.",
    },
    {
        "title": "Guns, Germs, and Steel",
        "author": "Jared Diamond",
        "isbn": "9780393317558",
        "category": "history",
        "publisher": "W. W. Norton",
        "published_year": 1997,
        "total_copies": 2,
        "available_copies": 2,
        "description": "The fates of human societies shaped by geography and environment.",
    },
    
    # Physics
    {
        "title": "Fundamentals of Physics",
        "author": "David Halliday, Robert Resnick, Jearl Walker",
        "isbn": "9781118230718",
        "category": "science",
        "publisher": "Wiley",
        "published_year": 2013,
        "total_copies": 4,
        "available_copies": 4,
        "description": "Comprehensive physics textbook covering mechanics to modern physics.",
    },
    {
        "title": "The Feynman Lectures on Physics",
        "author": "Richard P. Feynman",
        "isbn": "9780465024933",
        "category": "science",
        "publisher": "Basic Books",
        "published_year": 1963,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Classic physics lectures by Nobel laureate Richard Feynman.",
    },
    
    # Business
    {
        "title": "Principles",
        "author": "Ray Dalio",
        "isbn": "9781501124020",
        "category": "business",
        "publisher": "Simon & Schuster",
        "published_year": 2017,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Life and work principles from the founder of Bridgewater Associates.",
    },
    {
        "title": "The Lean Startup",
        "author": "Eric Ries",
        "isbn": "9780307887894",
        "category": "business",
        "publisher": "Crown Business",
        "published_year": 2011,
        "total_copies": 2,
        "available_copies": 2,
        "description": "How today's entrepreneurs use continuous innovation to create successful businesses.",
    },
    
    # Philosophy
    {
        "title": "Meditations",
        "author": "Marcus Aurelius",
        "isbn": "9780140449334",
        "category": "philosophy",
        "publisher": "Penguin Classics",
        "published_year": 180,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Personal writings of the Roman Emperor on Stoic philosophy.",
    },
    {
        "title": "The Republic",
        "author": "Plato",
        "isbn": "9780140449143",
        "category": "philosophy",
        "publisher": "Penguin Classics",
        "published_year": -380,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Socratic dialogue on justice and the ideal state.",
    },
    
    # Self-Help
    {
        "title": "Atomic Habits",
        "author": "James Clear",
        "isbn": "9780735211292",
        "category": "selfhelp",
        "publisher": "Avery",
        "published_year": 2018,
        "total_copies": 3,
        "available_copies": 3,
        "description": "An easy and proven way to build good habits and break bad ones.",
    },
    {
        "title": "The 7 Habits of Highly Effective People",
        "author": "Stephen R. Covey",
        "isbn": "9781982137274",
        "category": "selfhelp",
        "publisher": "Simon & Schuster",
        "published_year": 1989,
        "total_copies": 2,
        "available_copies": 2,
        "description": "Powerful lessons in personal change and effectiveness.",
    },
]

print(f"\n📚 Populating library for {tenant.name}...\n")

created_count = 0
updated_count = 0

for book_data in books:
    book_data['tenant'] = tenant
    
    # Check if book exists
    book, created = Book.objects.using(tenant.db_alias).get_or_create(
        isbn=book_data['isbn'],
        defaults=book_data
    )
    
    if created:
        created_count += 1
        print(f"✅ Created: {book.title} by {book.author}")
    else:
        updated_count += 1
        print(f"ℹ️  Already exists: {book.title}")

print(f"\n" + "="*60)
print(f"📊 Summary:")
print(f"   Created: {created_count} books")
print(f"   Existing: {updated_count} books")
print(f"   Total: {created_count + updated_count} books in library")
print(f"="*60)

# Show category breakdown
from django.db.models import Count
categories = Book.objects.using(tenant.db_alias).values('category').annotate(count=Count('category')).order_by('-count')

print(f"\n📑 Books by Category:")
for cat in categories:
    print(f"   {cat['category'].title()}: {cat['count']} books")

print(f"\n🎉 Library population complete!")
