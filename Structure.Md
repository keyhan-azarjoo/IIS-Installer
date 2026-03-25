This project is a project to manage the SERVER
The server can be Windows, Linux, Mac


on the SideBar, it should have OS (at top of side bar), Dashboard, File Manager, like how it is  but without SSL & Certificates



Dashboard:
    in dashboard, it should have a section for normal services like:
        Platform Services :
            section1
            ----------------------------------------------------------------
                1. running APIs 
                    a. DotNet
                            1. Docker
                            2. OS (service | Dimond)
                            3. IIS (Windows)
                    b. Python
                            1. Docker
                            2. OS (service | Dimond)
                            3. IIS (Windows)

                    
                2. S3
                    a. Docker
                    b. OS (service | Dimond)
                    c. IIS (Windows)

                3. MongoDb
                    a. Docker
                    b. OS (service | Dimond)
                    c. IIS (Windows)

                4. Python & Jupyter
                    a. Docker
                    b. OS (service | Dimond)
                
                5. Websites
                    a. Docker
                    b. OS (service | Dimond)
                    c. IIS (Windows)
                    D. (any other option exist)
            
            section2
            ----------------------------------------------------------------
                1. Files (DO NOT TUCH IT AND KEEP IT AS IT IS)
                2. Docker
                3. SSL & Sertificates

        AI & ML Services:
            Same as I gave you above but for Running different model on different Hardware and managing a server for AI
                1. SAM3 (Segment Anything Model 3)
                    a. Docker
                    b. OS (service | Daemon)
                    c. IIS (Windows)
                    d. GPU/TPU auto-detection and selection
                    e. Model download from dashboard
                    f. Username/Password + OS authentication
                    g. HTTPS with self-signed certificates
                    h. Nginx reverse proxy (Linux/macOS)


Rule:
In All Pages and servicess
    1. put a section to explain the page and options on that page
    2. Show the HTTP and HTTPS port for user (if the port has been used on other services, make the port box red and do not allow user to use that port as its been used by other services.)
    3. In each page, put a list of services for that page
        on the list, show the information for that row
        seperate the rows as one line and show tho feature for that row. like open the page, copy the URL. when user click on that row, it should open a box and show information for that row like which engin does they use and allow user to be able to change the ports and IPs and Sertificates and open the folder of the service filed and open it on Files page

    


this website is going to manage the whole server 
it should be a website that users use that to manage their servers

this website should be easy to use

all the files and codes should be components and reusable 

make the dashboard profecional and show the system information and CPU, Memory, OS, ... 




The whole website should be profecional
Use MUI in the whole page


in Web Terminal, show the logs on another place (like on the sidebar on the down side) that looks better and allow user to copy, clean the logs

All the component should be the same and all component in all services should be unified and function like eachother

use the whole features that they already have
make everyuthing run for ever except user pouse or delete it


make the notifications like popup and go after some seconds

put eay icon to show the passwords
