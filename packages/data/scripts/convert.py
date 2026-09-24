import pandas as pd
import json
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

excel_path = 'packages/data/San_pham_1000.xlsx'
df = pd.read_excel(excel_path)

categories = [
    { 'id': 'cat-1', 'name': 'Điện tử', 'slug': 'dien-tu' },
    { 'id': 'cat-2', 'name': 'Gia dụng', 'slug': 'gia-dung' },
    { 'id': 'cat-3', 'name': 'Mẹ và bé - đồ chơi trẻ em', 'slug': 'me-va-be-do-choi-tre-em' },
    { 'id': 'cat-4', 'name': 'Mỹ phẩm - chăm sóc cá nhân', 'slug': 'my-pham-cham-soc-ca-nhan' },
    { 'id': 'cat-5', 'name': 'Nội thất - trang trí', 'slug': 'noi-that-trang-tri' },
    { 'id': 'cat-6', 'name': 'Sách - văn phòng phẩm', 'slug': 'sach-van-phong-pham' },
    { 'id': 'cat-7', 'name': 'Thể thao - dã ngoại', 'slug': 'the-thao-da-ngoai' },
    { 'id': 'cat-8', 'name': 'Thời trang', 'slug': 'thoi-trang' },
    { 'id': 'cat-9', 'name': 'Thực phẩm - đồ uống', 'slug': 'thuc-pham-do-uong' },
    { 'id': 'cat-10', 'name': 'Vật nuôi - thú cưng', 'slug': 'vat-nuoi-thu-cung' }
]

# Write categories.json
os.makedirs('packages/data/json', exist_ok=True)
with open('packages/data/json/categories.json', 'w', encoding='utf-8') as f:
    json.dump(categories, f, ensure_ascii=False, indent=2)
print('Updated categories.json')

def clean_row(row):
    pid = str(row['id'])
    p = {
        'id': pid,
        'name': str(row['name']),
        'slug': str(row['slug']),
        'price': int(row['price']),
        'categoryId': str(row['categoryId']),
        'thumbUrl': f'https://picsum.photos/seed/{pid}/400/400',
        'detailUrl': f'https://picsum.photos/seed/{pid}/800/800',
        'description': str(row['description'])
    }
    if pd.notna(row.get('brand')): p['brand'] = str(row['brand'])
    if pd.notna(row.get('sku')): p['sku'] = str(row['sku'])
    if pd.notna(row.get('originalPrice')): p['originalPrice'] = int(row['originalPrice'])
    if pd.notna(row.get('discountPercent')): p['discountPercent'] = int(row['discountPercent'])
    if pd.notna(row.get('unit')): p['unit'] = str(row['unit'])
    if pd.notna(row.get('shortDescription')): p['shortDescription'] = str(row['shortDescription'])
    
    # gallery
    p['gallery'] = [
        f'https://picsum.photos/seed/{pid}-a/800/800',
        f'https://picsum.photos/seed/{pid}-b/800/800',
        f'https://picsum.photos/seed/{pid}-c/800/800'
    ]
    
    if pd.notna(row.get('specifications')):
        try:
            p['specifications'] = json.loads(str(row['specifications']))
        except Exception:
            pass

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
        try:
            p['tags'] = json.loads(str(row['tags']))
        except Exception:
            pass

    if pd.notna(row.get('createdAt')): p['createdAt'] = str(row['createdAt'])
    return p

all_products = [clean_row(row) for _, row in df.iterrows()]

p_20 = all_products[0:20]          # Product 1 to 20
p_500 = all_products[20:500]       # Product 21 to 500
p_2000 = all_products[500:1000]    # Product 501 to 1000

# Write root products-*.json
with open('packages/data/json/products-20.json', 'w', encoding='utf-8') as f:
    json.dump(p_20, f, ensure_ascii=False, indent=2)
print(f'Wrote {len(p_20)} items to products-20.json')

with open('packages/data/json/products-500.json', 'w', encoding='utf-8') as f:
    json.dump(p_500, f, ensure_ascii=False, indent=2)
print(f'Wrote {len(p_500)} items to products-500.json')

with open('packages/data/json/products-2000.json', 'w', encoding='utf-8') as f:
    json.dump(p_2000, f, ensure_ascii=False, indent=2)
print(f'Wrote {len(p_2000)} items to products-2000.json')

# Now also populate by-category/20, by-category/500, by-category/2000
cat_by_id = {c['id']: c['slug'] for c in categories}

def save_by_category(count, prod_list):
    dir_path = f'packages/data/json/by-category/{count}'
    os.makedirs(dir_path, exist_ok=True)
    grouped = {c['slug']: [] for c in categories}
    for p in prod_list:
        slug = cat_by_id.get(p['categoryId'])
        if slug:
            grouped[slug].append(p)
    for slug, items in grouped.items():
        with open(f'{dir_path}/{slug}.json', 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

save_by_category(20, p_20)
save_by_category(500, p_500)
save_by_category(2000, p_2000)
print('Populated by-category subdirectories successfully.')
