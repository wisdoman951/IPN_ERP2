-- Sample inventory transactions for testing
INSERT INTO inventory (product_id, staff_id, date, quantity, stock_in, stock_out, stock_loan, store_id, stock_threshold) VALUES
  (1, 1, '2024-06-01', 20, 20, 0, 0, 1, 10),
  (1, 1, '2024-06-05', -5, 0, 5, 0, 1, 10),
  (2, 2, '2024-06-02', 15, 15, 0, 0, 2, 15),
  (2, 2, '2024-06-07', -3, 0, 3, 0, 2, 15),
  (3, 3, '2024-06-03', 10, 10, 0, 0, 3, 20);
