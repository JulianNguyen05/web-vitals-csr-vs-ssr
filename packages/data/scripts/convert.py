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
                t_list = json.loads(t_val)
                p['tags'] = t_list
            except Exception:
                pass
        elif isinstance(t_val, list):
            p['tags'] = t_val

    if pd.notna(row.get('createdAt')): p['createdAt'] = str(row['createdAt'])
    return p

# Clean all products from df1 (1000 items) and df2 (1000 items)
all_df1_products = [clean_row_df1(row) for _, row in df1.iterrows()]
all_df2_products = [clean_row_bo2(row, idx) for idx, row in df2.iterrows()]

# Group by categoryId (200 real products per category)
products_by_category = {c['id']: [] for c in categories}
for p in all_df1_products:
    products_by_category[p['categoryId']].append(p)
for p in all_df2_products:
    products_by_category[p['categoryId']].append(p)

# 1. Populate by-category/20 (20 real Excel items per file)
dir_20 = 'packages/data/json/by-category/20'
os.makedirs(dir_20, exist_ok=True)
for cat in categories:
    cid = cat['id']
    slug = cat['slug']
    prods_20 = products_by_category[cid][:20]
    with open(f'{dir_20}/{slug}.json', 'w', encoding='utf-8') as f:
        json.dump(prods_20, f, ensure_ascii=False, indent=2)
        f.write('\n')
print("Populated by-category/20 with 20 real Excel items per file.")

# 2. Populate by-category/500 (All 200 real Excel items per file, NO generated items)
dir_500 = 'packages/data/json/by-category/500'
os.makedirs(dir_500, exist_ok=True)
for cat in categories:
    cid = cat['id']
    slug = cat['slug']
    prods_real = products_by_category[cid] # All 200 real Excel items
    with open(f'{dir_500}/{slug}.json', 'w', encoding='utf-8') as f:
        json.dump(prods_real, f, ensure_ascii=False, indent=2)
        f.write('\n')
print("Populated by-category/500 with 200 real Excel items per file (no generated items).")

print("Done updating by-category dataset!")
