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

def clean_row_df1(row):
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


def clean_row_bo2(row, idx):
    # idx 0 to 899 -> prod-1101 to prod-2000
    old_num_str = str(2001 + idx)
    new_num_str = str(1101 + idx)
    pid = f'prod-{new_num_str}'
    name = str(row['name'])
    slug = str(row['slug']).replace(f'-{old_num_str}', f'-{new_num_str}')
    thumbUrl = str(row['thumbUrl']) if pd.notna(row.get('thumbUrl')) else f'https://picsum.photos/seed/{pid}/400/400'
    thumbUrl = thumbUrl.replace(f'-{old_num_str}.webp', f'-{new_num_str}.webp')
    detailUrl = str(row['detailUrl']) if pd.notna(row.get('detailUrl')) else f'https://picsum.photos/seed/{pid}/800/800'
    detailUrl = detailUrl.replace(f'-{old_num_str}.webp', f'-{new_num_str}.webp')
    
    p = {
        'id': pid,
        'name': name,
        'slug': slug,
        'price': int(row['price']),
        'categoryId': str(row['categoryId']),
        'thumbUrl': thumbUrl,
        'detailUrl': detailUrl,
        'description': str(row['description'])
    }
    if pd.notna(row.get('brand')): p['brand'] = str(row['brand'])
    if pd.notna(row.get('sku')): p['sku'] = str(row['sku']).replace(f'-{old_num_str}-', f'-{new_num_str}-')
    if pd.notna(row.get('originalPrice')): p['originalPrice'] = int(row['originalPrice'])
    if pd.notna(row.get('discountPercent')): p['discountPercent'] = int(row['discountPercent'])
    if pd.notna(row.get('unit')): p['unit'] = str(row['unit'])
    if pd.notna(row.get('shortDescription')): p['shortDescription'] = str(row['shortDescription'])
    
    if pd.notna(row.get('gallery')):
        g_val = row['gallery']
        if isinstance(g_val, str):
            try:
                g_list = json.loads(g_val)
                p['gallery'] = [item.replace(f'-{old_num_str}-', f'-{new_num_str}-') for item in g_list]
            except Exception:
                p['gallery'] = [g_val.replace(f'-{old_num_str}-', f'-{new_num_str}-')]
        elif isinstance(g_val, list):
            p['gallery'] = [item.replace(f'-{old_num_str}-', f'-{new_num_str}-') for item in g_val]
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

# 1. products-20.json: prod-101 to prod-120 (20 items)
p_20 = [clean_row_df1(row) for _, row in df1.iloc[0:20].iterrows()]

# 2. products-500.json: prod-121 to prod-500 (380 items)
p_500 = [clean_row_df1(row) for _, row in df1.iloc[20:400].iterrows()]

# 3. products-2000.json: prod-501 to prod-2000
# - Part 1: prod-501 to prod-1100 (600 items from df1)
# - Part 2: prod-1101 to prod-2000 (900 items from df2 reindexed)
p_2000_part1 = [clean_row_df1(row) for _, row in df1.iloc[400:1000].iterrows()]
p_2000_part2 = [clean_row_bo2(row, idx) for idx, row in df2.iloc[0:900].iterrows()]
p_2000 = p_2000_part1 + p_2000_part2 # Total 1500 items (prod-501 to prod-2000)

# Write root products-*.json
with open('packages/data/json/products-20.json', 'w', encoding='utf-8') as f:
    json.dump(p_20, f, ensure_ascii=False, indent=2)
print(f'Wrote {len(p_20)} items to products-20.json (prod-101 to prod-120)')

with open('packages/data/json/products-500.json', 'w', encoding='utf-8') as f:
    json.dump(p_500, f, ensure_ascii=False, indent=2)
print(f'Wrote {len(p_500)} items to products-500.json (prod-121 to prod-500)')

with open('packages/data/json/products-2000.json', 'w', encoding='utf-8') as f:
    json.dump(p_2000, f, ensure_ascii=False, indent=2)
print(f'Wrote {len(p_2000)} items to products-2000.json (prod-501 to prod-2000)')

# Populate by-category/20, by-category/500, by-category/2000
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
