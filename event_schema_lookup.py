import os
import pytest
import logging as logger
import allure
import time

from playwright.sync_api import Page
from lib.airis.airis_ui.configure.event_schema import EventSchemaOperation
from lib.airis.airis_ui.configure.data_store import DataStoreOperation
from lib.airis.api_client import AirisAPIClient

import requests
STORE_NAME = 'test_3mb_comma'
FILE_NAME = 'test_3mb_comma.csv'

@allure.story('Test event schema lookup')
class TestEventSchemaLookup:
    @pytest.fixture(autouse=True, scope='class')
    def setup_project(self, airis_page: Page):
        self.page = airis_page
        self.project_id = "qa-test-mock.appier.app"
        self.test_data_folder = 'refactored/tests/airis/data_onboarding/data_store_test_data'
        self.event_schema_operation = EventSchemaOperation(self.page, self.project_id, test_data_folder=self.test_data_folder)
        self.data_store_operation = DataStoreOperation(self.page, self.project_id, test_data_folder=self.test_data_folder)
        self.client = AirisAPIClient(account='default')
        self.test_properties_payload = {
            "event": "event_schema_test",
            "cv_email": "brownlinda49@example.com",
            "cv_name": "Brown Linda",
            "cv_phone":"0846383035",
            "ce_issue_id": "970782",
            "ce_issue_name": "user_registration",
        }


    @allure.title("Create a new data store")
    def test_create_data_store(self):
        csv_path = os.path.join(f"{self.test_data_folder}/{FILE_NAME}")

        self.data_store_operation.go_to_data_store_home()
        self.data_store_operation.click_new_data_store()
        self.data_store_operation.enter_data_store_name(store_name=STORE_NAME)
        self.data_store_operation.upload_csv(csv_path)
        self.data_store_operation.fill_input_separator(store_name=STORE_NAME)

        # if success, we should can be able to click "import" button
        self.data_store_operation.click_import_button()

        # prepare for unsaved dialog
        # then we can click save button
        self.data_store_operation.prepare_for_unsaved_alert()
        self.data_store_operation.click_save_data_store()

        # verify content
        self.data_store_operation.verify_table_content(store_name=STORE_NAME)

    @allure.title("Create a new event schema")
    def test_create_event_schema(self):
        self.event_schema_operation.go_to_event_schema_home()
        self.event_schema_operation.create_new_event_schema()
        self.event_schema_operation.enter_event_schema_title()
        self.event_schema_operation.enter_event_schema_key()
        self.event_schema_operation.add_property()
        self.event_schema_operation.fill_first_property()
        self.event_schema_operation.click_create_button()

    @allure.title("Lookup the event schema")
    def test_event_schema_lookup(self):
        self.client.track_customer_event(self.test_properties_payload)

        # need to make up a check logic


    @allure.title("Delete the event schema")
    def test_delete_event_schema(self):
        self.event_schema_operation.delete_event_schema()
        

    @allure.title("Lookup the event schema again after delete the schema")
    def test_event_sckema_lookup_after_deleted(self):
        

    @allure.title("Delete the data store")
    def test_delete_data_store(self):
        self.data_store_operation.prepare_for_unsaved_alert()
        self.data_store_operation.delete_data_store()
        logger.info('Delete the data store successfully')