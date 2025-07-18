@echo off
setlocal

:: 指定要輸出的檔案名稱
set OUTPUT=files_list.txt

:: 清空舊檔案內容（如果存在）
if exist "%OUTPUT%" del "%OUTPUT%"

:: 遍歷當前目錄與子目錄所有檔案
for /R %%F in (*) do (
    echo %%~fF >> "%OUTPUT%"
)

echo 所有檔案名稱已輸出到 %OUTPUT%
pause
