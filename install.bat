@echo on
npm install > install.log 2>&1
exit /B %errorlevel%