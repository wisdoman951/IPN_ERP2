# server/app/models/stress_test_model.py
import pymysql
from app.config import DB_CONFIG
import traceback
from datetime import datetime, date

def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
def calc_stress_scores(answers: dict) -> dict:
    """
    answers: {'01': '甲', '02': '乙', ...} or {'01': 'A', ...}
    回傳 {'a': x, 'b': y, 'c': z, 'd': w}
    """
    mapping = {
        "01": ("a", "b"),
        "02": ("c", "b"),
        "03": ("c", "d"),
        "04": ("c", "a"),
        "05": ("b", "d"),
        "06": ("d", "c"),
        "07": ("a", "d"),
        "08": ("c", "b"),
        "09": ("c", "d"),
        "10": ("d", "a"),
        "11": ("b", "d"),
        "12": ("c", "a"),
        "13": ("b", "c"),
        "14": ("b", "a"),
        "15": ("b", "d"),
        "16": ("c", "a"),
        "17": ("b", "d"),
        "18": ("d", "a"),
        "19": ("a", "c"),
        "20": ("b", "a"),
    }
    scores = {"a": 0, "b": 0, "c": 0, "d": 0}
    for q, ans in answers.items():
        idx = q.zfill(2)
        if idx not in mapping:
            continue
        is_jia = ans in ["甲", "A"]
        is_yi = ans in ["乙", "B"]
        if is_jia:
            scores[mapping[idx][0]] += 1
        elif is_yi:
            scores[mapping[idx][1]] += 1
    return scores

def format_stress_test_record(record: dict):
    """將資料庫查詢出的單筆字典，轉換為前端需要的格式"""
    if not record:
        return None
    
    # 將日期物件轉換為 YYYY-MM-DD 格式的字串，如果為 None 則返回 None
    test_date_val = record.get('test_date')
    if isinstance(test_date_val, (datetime, date)):
        test_date_str = test_date_val.strftime('%Y-%m-%d')
    elif isinstance(test_date_val, str) and len(test_date_val) >= 10:
        # 萬一DB是字串(舊格式)也只取前10碼
        test_date_str = test_date_val[:10]
    else:
        test_date_str = ""
    return {
        'ipn_stress_id': record.get('ipn_stress_id'),
        'member_id': record.get('member_id'),
        'Name': record.get('name'),             # <-- 改為大寫 'Name'
        'member_code': record.get('member_code'),
        'position': record.get('occupation'),   # <-- 將 'occupation' 轉為 'position'
        'a_score': record.get('a_score'),
        'b_score': record.get('b_score'),
        'c_score': record.get('c_score'),
        'd_score': record.get('d_score'),
        'test_date': test_date_str,
        'total_score': record.get('total_score'),
        'store_id': record.get('store_id')
    }

def get_all_stress_tests(store_level: str, store_id: int, filters=None):
    """根據權限和過濾條件獲取所有壓力測試記錄"""
    conn = connect_to_db()
    print("收到的 filters:", filters)

    try:
        with conn.cursor() as cursor:
            base_sql = """
            SELECT s.ipn_stress_id, s.member_id, m.name, m.member_code, m.occupation,
                   s.a_score, s.b_score, s.c_score, s.d_score, s.test_date, 
                   (s.a_score + s.b_score + s.c_score + s.d_score) AS total_score,
                   s.store_id
            FROM ipn_stress s
            LEFT JOIN member m ON s.member_id = m.member_id
            """

            params = []
            where_conditions = []

            # 權限過濾
            if store_level == "分店":
                where_conditions.append("s.store_id = %s")
                params.append(store_id)

            # 智慧搜尋（支援名字、職稱、會員編號、電話）
            # 建議前端送 smart_keyword 或你直接用 name 也可以
            smart_kw = filters.get('smart_keyword') or filters.get('name')
            if smart_kw:
                where_conditions.append(
                    "(m.name LIKE %s OR m.member_code LIKE %s OR m.occupation LIKE %s)"
                )
                params.extend([
                    f"%{smart_kw}%",
                    f"%{smart_kw}%",
                    f"%{smart_kw}%"
                ])

            # 其它條件照原本
            if filters.get('test_date'):
                where_conditions.append("s.test_date = %s")
                params.append(filters['test_date'])
            if filters.get('member_code'):
                where_conditions.append("(m.member_code = %s OR s.member_id = %s)")
                params.extend([filters['member_code'], filters['member_code']])
            if filters.get('position'):
                where_conditions.append("m.occupation LIKE %s")
                params.append(f"%{filters['position']}%")

            if where_conditions:
                base_sql += " WHERE " + " AND ".join(where_conditions)
            
            base_sql += " ORDER BY s.test_date DESC, s.ipn_stress_id DESC"
            print("SQL:", base_sql)
            print("Params:", params)
            cursor.execute(base_sql, tuple(params))
            results = cursor.fetchall()

            formatted_results = [format_stress_test_record(r) for r in results]
            return formatted_results
    except Exception as e:
        traceback.print_exc()
        raise e
    finally:
        conn.close()


def add_stress_test(member_id, test_date, answers, store_id: int):
    """
    計算壓力測試分數並將結果存入資料庫，包含 store_id
    """
    score_map = {'A': {'a': 10, 'b': 0, 'c': 5, 'd': 0}, 'B': {'a': 0, 'b': 10, 'c': 0, 'd': 5}}
    scores = {'a': 0, 'b': 0, 'c': 0, 'd': 0}
    
    for q_id, answer in answers.items():
        if answer in score_map:
            for score_type in scores:
                scores[score_type] += score_map[answer].get(score_type, 0)

    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO ipn_stress (member_id, test_date, a_score, b_score, c_score, d_score, store_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                member_id, test_date, scores['a'], scores['b'],
                scores['c'], scores['d'], store_id
            )
            cursor.execute(sql, params)
        conn.commit()
        return {"success": True, "message": "壓力測試結果已成功新增"}
    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        raise e
    finally:
        conn.close()

def get_stress_test_by_id(stress_id: int):
    """根據ID獲取單筆壓力測試記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
            SELECT s.ipn_stress_id, s.member_id, m.name, m.member_code, m.occupation,
                   s.a_score, s.b_score, s.c_score, s.d_score, s.test_date,
                   (s.a_score + s.b_score + s.c_score + s.d_score) AS total_score,
                   s.store_id
            FROM ipn_stress s
            LEFT JOIN member m ON s.member_id = m.member_id
            WHERE s.ipn_stress_id = %s
            """
            cursor.execute(query, (stress_id,))
            result = cursor.fetchone()
            # 返回前也進行格式化
            return format_stress_test_record(result)
    except Exception as e:
        traceback.print_exc()
        raise e
    finally:
        conn.close()

# 其他函式 (update, delete) 保持不變，權限檢查將在路由層處理
def update_stress_test(stress_id, scores):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE ipn_stress 
                SET a_score = %s, b_score = %s, c_score = %s, d_score = %s
                WHERE ipn_stress_id = %s
                """,
                (scores.get('a_score', 0), scores.get('b_score', 0), scores.get('c_score', 0),
                 scores.get('d_score', 0), stress_id)
            )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_stress_test(stress_id):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM ipn_stress_answer WHERE ipn_stress_id = %s", (stress_id,))
            cursor.execute("DELETE FROM ipn_stress WHERE ipn_stress_id = %s", (stress_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_stress_tests_by_member_id(member_id: int, store_level: str, store_id: int):
    """根據權限獲取特定會員的所有壓力測試記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            params = [member_id]
            where_conditions = ["s.member_id = %s"]

            if store_level == "分店":
                where_conditions.append("s.store_id = %s")
                params.append(store_id)
            
            where_clause = " AND ".join(where_conditions)

            query = f"""
            SELECT s.ipn_stress_id, s.member_id, m.name, m.member_code, m.occupation,
                   s.a_score, s.b_score, s.c_score, s.d_score, s.test_date,
                   (s.a_score + s.b_score + s.c_score + s.d_score) AS total_score,
                   s.store_id
            FROM ipn_stress s
            LEFT JOIN member m ON s.member_id = m.member_id
            WHERE {where_clause}
            ORDER BY s.test_date DESC, s.ipn_stress_id DESC
            """
            
            cursor.execute(query, tuple(params))
            results = cursor.fetchall()
            # 返回前也進行格式化
            formatted_results = [format_stress_test_record(r) for r in results]
            return formatted_results
    except Exception as e:
        traceback.print_exc()
        raise e
    finally:
        conn.close()
        
def add_stress_test_with_answers(member_id, test_date, answers_dict, store_id):
    from app.models.stress_test_model import calc_stress_scores
    # 自動計算分數
    scores = calc_stress_scores(answers_dict)

    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 1. Insert into main table
            sql = """
                INSERT INTO ipn_stress (member_id, test_date, a_score, b_score, c_score, d_score, store_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                member_id, test_date, scores['a'], scores['b'],
                scores['c'], scores['d'], store_id
            ))
            stress_id = cursor.lastrowid

            # 2. Insert answers
            ans_sql = "INSERT INTO ipn_stress_answer (ipn_stress_id, question_no, answer) VALUES (%s, %s, %s)"
            for qid, ans in answers_dict.items():
                cursor.execute(ans_sql, (stress_id, qid, ans))

        conn.commit()
        return {"success": True, "id": stress_id}
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_stress_test_by_id_with_answers(stress_id):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM ipn_stress WHERE ipn_stress_id = %s
            """, (stress_id,))
            main = cursor.fetchone()
            if not main:
                return None

            cursor.execute("""
                SELECT question_no, answer FROM ipn_stress_answer WHERE ipn_stress_id = %s
            """, (stress_id,))
            answers = {row['question_no']: row['answer'] for row in cursor.fetchall()}

            main['answers'] = answers
            return main
    finally:
        conn.close()

def update_stress_test_with_answers(stress_id, answers_dict):
    from app.models.stress_test_model import calc_stress_scores
    scores = calc_stress_scores(answers_dict)
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE ipn_stress
                SET a_score=%s, b_score=%s, c_score=%s, d_score=%s
                WHERE ipn_stress_id=%s
            """, (scores['a'], scores['b'], scores['c'], scores['d'], stress_id))

            # Remove old answers, then add new
            cursor.execute("DELETE FROM ipn_stress_answer WHERE ipn_stress_id=%s", (stress_id,))
            ans_sql = "INSERT INTO ipn_stress_answer (ipn_stress_id, question_no, answer) VALUES (%s, %s, %s)"
            for qid, ans in answers_dict.items():
                cursor.execute(ans_sql, (stress_id, qid, ans))

        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
