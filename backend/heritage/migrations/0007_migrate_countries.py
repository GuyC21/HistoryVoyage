from django.db import migrations

def seed_countries_and_migrate_relations(apps, schema_editor):
    Country = apps.get_model('heritage', 'Country')
    HistoricalSite = apps.get_model('heritage', 'HistoricalSite')

    # Seed the initial countries
    initial_countries = [
        {'name': 'Israel', 'code': 'IL', 'bbox': [29.4, 34.0, 33.5, 36.0]},
        {'name': 'Greece', 'code': 'GR', 'bbox': [34.7, 19.3, 41.8, 28.3]},
        {'name': 'Italy', 'code': 'IT', 'bbox': [35.4, 6.6, 47.1, 18.5]},
    ]

    countries_map = {}
    for c_data in initial_countries:
        country, created = Country.objects.get_or_create(
            name=c_data['name'],
            defaults={'code': c_data['code'], 'bbox': c_data['bbox']}
        )
        countries_map[c_data['name'].lower()] = country

    # Perform highly efficient bulk updates instead of looping site.save()
    HistoricalSite.objects.filter(country__icontains='israel').update(country_new=countries_map['israel'])
    HistoricalSite.objects.filter(country__icontains='greece').update(country_new=countries_map['greece'])
    HistoricalSite.objects.filter(country__icontains='italy').update(country_new=countries_map['italy'])
    
    # Clean up any leftover records just in case
    HistoricalSite.objects.filter(country_new__isnull=True).update(country_new=countries_map['israel'])

def reverse_migration(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('heritage', '0006_country_historicalsite_country_new'),
    ]

    operations = [
        migrations.RunPython(seed_countries_and_migrate_relations, reverse_code=reverse_migration),
    ]
