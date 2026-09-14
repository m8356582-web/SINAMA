# دیتابیس سینما

## جداول

### users - کاربران
- id
- phone (یکتا)
- first_name
- last_name
- father_name
- password
- role (user, admin2, admin1)
- code
- card_number
- total_points
- invite_code

### movies - فیلم‌ها
- id
- name
- release_date
- release_time
- capacity
- price
- status (now_showing, coming_soon, ended)
- director
- actors
- genre
- duration
- age_rating
- imdb_rating
- trailer_url
- description

### bookings - رزروها
- id
- user_id
- movie_id
- ticket_count
- passengers (JSONB)
- total_price
- original_price
- discount_code
- discount_amount
- payment_status
- payment_date
- status
- booking_code
- receipt_image
- receipt_notes

### attendances - حضور و غیاب
- id
- booking_id
- user_id
- movie_id
- check_in_time
- check_out_time
- status
- notes

### reviews - نظرات
- id
- user_id
- movie_id
- rating (1-5)
- comment

### notifications - اعلان‌ها
- id
- user_id
- title
- message
- type
- is_read
- link

### favorites - علاقه‌مندی‌ها
- id
- user_id
- movie_id

### watchlist - تماشای بعدی
- id
- user_id
- movie_id

### discount_codes - کد تخفیف
- id
- code
- discount_type (percent, fixed)
- discount_value
- max_uses
- used_count
- min_amount
- is_active

### settings - تنظیمات
- id
- key
- value