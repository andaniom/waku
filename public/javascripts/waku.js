document.addEventListener("DOMContentLoaded", function (event) {

    const showNavbar = (toggleId, navId, bodyId, headerId) => {
        const toggle = document.getElementById(toggleId),
            nav = document.getElementById(navId),
            bodypd = document.getElementById(bodyId),
            headerpd = document.getElementById(headerId)

        if (toggle && nav && bodypd && headerpd) {
            toggle.addEventListener('click', () => {
                nav.classList.toggle('nav-show')
                toggle.classList.toggle('bx-x')
                bodypd.classList.toggle('body-pd')
                headerpd.classList.toggle('body-pd')
            })
        }
    }

    showNavbar('header-toggle', 'nav-bar', 'body-pd', 'header')

    /*===== LINK ACTIVE =====*/
    // const linkColor = document.querySelectorAll('.nav_link')
    //
    // function colorLink() {
    //     if (linkColor) {
    //         // console.log(colorLink())
    //         linkColor.forEach(function (l) {
    //             l.classList.remove('active');
    //         })
    //         linkColor.forEach(function (l) {
    //             console.log(l.getAttribute("href"), " ", currentUrl.indexOf(l.getAttribute("href")))
    //             if (currentUrl.indexOf(l.getAttribute("href")) !== -1) {
    //                 l.classList.add('active')
    //             }
    //         })
    //         this.classList.remove('active')
    //     }
    // }
    //
    // linkColor.forEach(l => l.addEventListener('click', colorLink))

    // Your code to run since DOM is loaded and ready
    $(document).ready(function() {
        var currentPath = window.location.pathname;
        $('.nav_link[href="'+currentPath+'"]').addClass('active');
    });

});