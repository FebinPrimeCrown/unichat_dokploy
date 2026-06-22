import mysql.connector

# Database connection details
db_config = {
    'user': 'root',
    'password': 'myexam1234',
    'host': 'localhost',
    'database': 'jwt_test'
}

# Data to insert into domain_prices table
data = [
    (268, 17, 4, 'Domain Name', 899.00, 1139.00, 'INR', 'Yearly', '2021-09-10 02:57:53', 'Active', '2024-09-25 05:34:54', '2021-09-10 02:57:53', '2024-09-10 02:57:53'),
    (269, 17, 4, 'Domain Name', 539.00, 689.00, 'INR', 'Yearly', '2021-09-10 02:57:53', 'Active', '2025-08-02 23:24:04', '2021-09-10 02:57:53', '2024-09-10 02:57:53')
]

# SQL Insert query
query = '''
INSERT INTO orders 
(order_id, organisation_id, product_id, product_name, first_purchase_amount, total_amount, currency, billing_cycle, order_date, status, next_renewal, created_at, updated_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
'''

# Connect to the database and insert the data
try:
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    cursor.executemany(query, data)  # Use executemany() to insert multiple rows
    connection.commit()
    print(f"{cursor.rowcount} rows inserted successfully into the domain_prices table.")
except mysql.connector.Error as err:
    print(f"Error: {err}")
finally:
    cursor.close()
    connection.close()