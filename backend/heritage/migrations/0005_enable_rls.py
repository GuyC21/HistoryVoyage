from django.db import migrations

def enable_rls(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("ALTER TABLE heritage_historicalsite ENABLE ROW LEVEL SECURITY;")

def disable_rls(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("ALTER TABLE heritage_historicalsite DISABLE ROW LEVEL SECURITY;")

class Migration(migrations.Migration):

    dependencies = [
        ('heritage', '0004_historicalsite_boundary'),
    ]

    operations = [
        migrations.RunPython(enable_rls, reverse_code=disable_rls),
    ]
