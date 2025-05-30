@echo off
echo Deploying Frontend...
git add .
git commit -m "Deployment %date% %time%"
git push origin master

echo Deploying Backend...
cd backend
git add .
git commit -m "Backend Deployment %date% %time%"
git push origin master
cd ..

echo Deployment Complete!