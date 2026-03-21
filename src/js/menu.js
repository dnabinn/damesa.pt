import { supabase } from './supabase.js'

// Fetch full menu for a restaurant
export async function getMenu(restaurantId) {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*)')
    .eq('restaurant_id', restaurantId)
    .order('sort_order')
  return { categories: data, error }
}

// Add a menu item
export async function addMenuItem(categoryId, item) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({ category_id: categoryId, ...item })
    .select()
    .single()
  return { item: data, error }
}

// Update a menu item
export async function updateMenuItem(itemId, updates) {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()
  return { item: data, error }
}

// Delete a menu item
export async function deleteMenuItem(itemId) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)
  return { error }
}

// Add a menu category
export async function addMenuCategory(restaurantId, name, sortOrder = 0) {
  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder })
    .select()
    .single()
  return { category: data, error }
}
