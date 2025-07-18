from playwright.async_api import Page, Locator
import pandas as pd
import logging as logger
import re
import allure

TEST_DATA_FILE = "test_3mb_comma.csv"

class EventSchemaOperation:
    def __init__(self, page: Page, project: str, event_schema_name: str = 'test_event_schema', test_data_folder: str = 'refactored/tests/airis/data_onboarding/data_store_test_data'):
        self.page = page
        self.project = project
        self.event_schema_name = event_schema_name
        self.test_data_folder = test_data_folder

    @allure.step("Go to event schema home")
    def go_to_event_schema_home(self):
        target_url = f"https://airis.appier.com/project/{self.project}/configure/schema/events"
        self.page.goto(target_url)
        self.page.wait_for_url(f"**/project/{self.project}/configure/schema/events")
        logger.info("Went to event schema page")

    @allure.step("Click 'New Event Schema' button")
    def create_new_event_schema(self):
        new_event_schema_btn = self.page.get_by_role("button", name="New Event Schema")
        new_event_schema_btn.wait_for()
        new_event_schema_btn.click()
        self.page.wait_for_url("**/configure/schema/events/new")
        logger.info("Clicked create 'New Event Schema'")

    @allure.step("Enter event schema title")
    def enter_event_schema_title(self):
        title_input = self.page.get_by_role("textbox", name="Edit Title")
        self._fill_input(title_input, self.event_schema_name)
        logger.info("Filled event schema title")

    @allure.step("Enter event schema key")
    def enter_event_schema_key(self):
        key_input = self.page.locator(".bp3-input").first
        self._fill_input(key_input, self.event_schema_name)
        logger.info("Filled event schema key")

    @allure.step("Click 'Add Property'")
    def add_property(self):
        add_property_btn = self.page.get_by_role("button", name="Add Property")
        add_property_btn.wait_for()
        add_property_btn.click()
        logger.info("Added Property")

    @allure.step("Fill first property with 'issue_id'")
    def fill_first_property(self):
        first_property_key = self.page.locator(".sc-hfKAOj > div > .bp3-input").first
        self._fill_input(first_property_key, "issue_id")

        first_property_title = self.page.locator("div:nth-child(4) > .bp3-input").first
        self._fill_input(first_property_title, "issue_id")

        logger.info("Filled first property")

    @allure.step("Fill second property with 'issue_key'")
    def fill_second_property(self):
        second_property_prefix = "div:nth-child(2) > .sc-oCmfR > .bp3-collapse > .bp3-collapse-body > .floating-list-item-body > .sc-hfKAOj"

        second_property_key = self.page.locator(f"{second_property_prefix} > div > .bp3-input").first
        self._fill_input(second_property_key, "issue_key")

        second_property_title = self.page.locator(f"{second_property_prefix} > div:nth-child(4) > .bp3-input").first
        self._fill_input(second_property_title, "issue_key")

        logger.info("Filled second property")

    @allure.step("Select formula: DATASTORE_LOOKUP")
    def select_formula_datastore_lookup(self):
        formula_textbox = self.page.get_by_role("textbox", name="Enter function, variable or").nth(1)
        formula_textbox.wait_for()
        formula_textbox.click()

        datastore_lookup_item = self.page.locator("a").filter(has_text="DATASTORE_LOOKUPText")
        datastore_lookup_item.wait_for()
        datastore_lookup_item.click()

    @allure.step("Select resource table")
    def select_resource_table(self):
        resource_table_item = self.page.get_by_text("test_3mb_commaData Store")
        resource_table_item.wait_for()
        resource_table_item.click()

    @allure.step("Select column name 'issue_id'")
    def select_column_name(self):
        column_name_textbox = self.page.get_by_role("textbox", name="if column name")
        column_name_textbox.wait_for()
        column_name_textbox.click()

        issue_id_item = self.page.get_by_text("issue_idData Store Column")
        issue_id_item.wait_for()
        issue_id_item.click()
        logger.info("Selected issue_id as compare column name")

    @allure.step("Select column value 'issue_id'")
    def select_column_value(self):
        column_value_textbox = self.page.get_by_role("textbox", name="if column value")
        column_value_textbox.wait_for()
        column_value_textbox.click()

        issue_id_item = self.page.get_by_text("issue_idText")
        issue_id_item.wait_for()
        issue_id_item.click()
        logger.info("Selected issue_id as column value")

    @allure.step("Select return column 'issue_key'")
    def select_return_column(self):
        return_column_textbox = self.page.get_by_role("textbox", name="return column name")
        return_column_textbox.wait_for()
        return_column_textbox.click()

        issue_key_item = self.page.get_by_text("issue_keyData Store Column")
        issue_key_item.wait_for()
        issue_key_item.click()
        logger.info("Selected issue_key as return column")

    @allure.step("Click 'Create' button")
    def click_create_button(self):
        create_button = self.page.get_by_role("button", name="Create")
        create_button.wait_for()
        create_button.click()
        logger.info("Clicked create button")

        self.page.wait_for_url(timeout=30000)
        assert not self.page.url.endswith("/new"), "Still stuck on /new page"
        logger.info("Event schema created successfully")

    @allure.step("Read test data")
    def get_test_data(self):
        return pd.read_csv(f"{self.test_data_folder}/{TEST_DATA_FILE}")

    @allure.step("Delete event schema")
    def delete_event_schema(self):
        target_url = f"https://airis.appier.com/project/{self.project}/configure/schema/events"
        self.page.goto(target_url)
        self.page.wait_for_url(f"**/project/{self.project}/configure/schema/events")

        event_schema_link = self.page.get_by_role("link", name=self.event_schema_name).first
        event_schema_link.wait_for()
        event_schema_link.click()

        more_button_container = self.page.locator("div").filter(has_text=re.compile(r"^test_event_schemaEdit DescriptionSave$"))
        more_button = more_button_container.get_by_test_id("more-button")
        more_button.wait_for()
        more_button.click()

        delete_link = self.page.locator("a").filter(has_text="Delete")
        delete_link.wait_for()
        delete_link.click()

        delete_button = self.page.get_by_role("button", name="Delete")
        delete_button.wait_for()
        delete_button.click()
        logger.info("Click delete button")

        self.page.wait_for_url('**/configure/schema/events')
        logger.info("Deleted event schema successfully")

    def _fill_input(self, locator: Locator, value: str):
        locator.wait_for()
        locator.click()
        locator.fill(value)