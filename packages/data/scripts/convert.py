import pandas as pd
import json
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

excel_path_1 = 'packages/data/San_pham_1000.xlsx'
excel_path_2 = 'packages/data/San_pham_1000_bo2.xlsx'

df1 = pd.read_excel(excel_path_1)
df2 = pd.read_excel(excel_path_2)

categories_path = 'packages/data/json/categories.json'
with open(categories_path, 'r', encoding='utf-8') as f:
    categories = json.load(f)

def clean_row(row):
    pid = str(row['id'])
    p = {
        'id': pid,
        'name': str(row['name']),
        'slug': str(row['slug']),
        'price': int(row['price']),
        'categoryId': str(row['categoryId']),
        'thumbUrl': str(row['thumbUrl']) if pd.notna(row.get('thumbUrl')) else f'https://picsum.photos/seed/{pid}/400/400',
        'detailUrl': str(row['detailUrl']) if pd.notna(row.get('detailUrl')) else f'https://picsum.photos/seed/{pid}/800/800',
        'description': str(row['description'])
    }
    if pd.notna(row.get('brand')): p['brand'] = str(row['brand'])
    if pd.notna(row.get('sku')): p['sku'] = str(row['sku'])
    if pd.notna(row.get('originalPrice')): p['originalPrice'] = int(row['originalPrice'])
    if pd.notna(row.get('discountPercent')): p['discountPercent'] = int(row['discountPercent'])
    if pd.notna(row.get('unit')): p['unit'] = str(row['unit'])
    if pd.notna(row.get('shortDescription')): p['shortDescription'] = str(row['shortDescription'])
    
    if pd.notna(row.get('gallery')):
        g_val = row['gallery']
        if isinstance(g_val, str):
            try:
                p['gallery'] = json.loads(g_val)
            except Exception:
                p['gallery'] = [g_val]
        elif isinstance(g_val, list):
            p['gallery'] = g_val
    else:
        p['gallery'] = [
            f'https://picsum.photos/seed/{pid}-a/800/800',
            f'https://picsum.photos/seed/{pid}-b/800/800',
            f'https://picsum.photos/seed/{pid}-c/800/800'
        ]
    
    if pd.notna(row.get('specifications')):
        s_val = row['specifications']
        if isinstance(s_val, str):
            try:
                p['specifications'] = json.loads(s_val)
            except Exception:
                pass
        elif isinstance(s_val, dict):
            p['specifications'] = s_val

    if pd.notna(row.get('rating_average')) and pd.notna(row.get('rating_count')):
        p['rating'] = {
            'average': float(row['rating_average']),
            'count': int(row['rating_count'])
        }

    if pd.notna(row.get('stock')): p['stock'] = int(row['stock'])
    if pd.notna(row.get('soldCount')): p['soldCount'] = int(row['soldCount'])
    if pd.notna(row.get('weight')):
        val = row['weight']
        p['weight'] = float(val) if '.' in str(val) else int(val)

    if pd.notna(row.get('dimensions_length')) and pd.notna(row.get('dimensions_width')) and pd.notna(row.get('dimensions_height')):
        p['dimensions'] = {
            'length': float(row['dimensions_length']),
            'width': float(row['dimensions_width']),
            'height': float(row['dimensions_height'])
        }

    if pd.notna(row.get('origin')): p['origin'] = str(row['origin'])
    if pd.notna(row.get('warranty')): p['warranty'] = str(row['warranty'])

    if pd.notna(row.get('tags')):
        t_val = row['tags']
        if isinstance(t_val, str):
            try:
                p['tags'] = json.loads(t_val)
            except Exception:
                pass
        elif isinstance(t_val, list):
            p['tags'] = t_val

    if pd.notna(row.get('createdAt')): p['createdAt'] = str(row['createdAt'])
    return p

all_df1_products = [clean_row(row) for _, row in df1.iterrows()]
all_df2_products = [clean_row(row) for _, row in df2.iterrows()]

products_by_category = {c['id']: [] for c in categories}
for p in all_df1_products:
    products_by_category[p['categoryId']].append(p)
for p in all_df2_products:
    products_by_category[p['categoryId']].append(p)

dir_20 = 'packages/data/json/by-category/20'
dir_500 = 'packages/data/json/by-category/500'
dir_2000 = 'packages/data/json/by-category/2000'

os.makedirs(dir_20, exist_ok=True)
os.makedirs(dir_500, exist_ok=True)
os.makedirs(dir_2000, exist_ok=True)

merged_20 = []
merged_500 = []
merged_2000 = []

for cat in categories:
    cid = cat['id']
    slug = cat['slug']
    cat_prods = products_by_category[cid] # 200 items per category
    
    p20 = cat_prods[0:2]     # 2 items per category (20 total)
    p500 = cat_prods[0:50]   # 50 items per category (500 total, includes 20)
    p2000 = cat_prods[0:200] # 200 items per category (2000 total, includes 500)

    merged_20.extend(p20)
    merged_500.extend(p500)
    merged_2000.extend(p2000)
    
    with open(f'{dir_20}/{slug}.json', 'w', encoding='utf-8') as f:
        json.dump(p20, f, ensure_ascii=False, indent=2)
        f.write('\n')
        
    with open(f'{dir_500}/{slug}.json', 'w', encoding='utf-8') as f:
        json.dump(p500, f, ensure_ascii=False, indent=2)
        f.write('\n')

    with open(f'{dir_2000}/{slug}.json', 'w', encoding='utf-8') as f:
        json.dump(p2000, f, ensure_ascii=False, indent=2)
        f.write('\n')

with open('packages/data/json/products-20.json', 'w', encoding='utf-8') as f:
    json.dump(merged_20, f, ensure_ascii=False, indent=2)
    f.write('\n')

with open('packages/data/json/products-500.json', 'w', encoding='utf-8') as f:
    json.dump(merged_500, f, ensure_ascii=False, indent=2)
    f.write('\n')

with open('packages/data/json/products-2000.json', 'w', encoding='utf-8') as f:
    json.dump(merged_2000, f, ensure_ascii=False, indent=2)
    f.write('\n')

print("Successfully converted 2000 products into:")
print(f" - by-category/20 (2 items * 10 = {len(merged_20)} total) -> products-20.json")
print(f" - by-category/500 (50 items * 10 = {len(merged_500)} total) -> products-500.json")
print(f" - by-category/2000 (200 items * 10 = {len(merged_2000)} total) -> products-2000.json")
