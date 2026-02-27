import dj_database_url
d = dj_database_url.parse('postgresql://postgres:juKGWxVyqjOzePLtIlWsxWNsWdCAbBnr@e-learningwebapp.railway.internal:5432/')
d['NAME'] = ''
print(d)
