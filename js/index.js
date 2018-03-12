
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
            || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
(function() {

    var width, height, largeHeader, canvas, ctx, points, target, animateHeader = true;

    // Main
    initHeader();
    initAnimation();
    addListeners();

    function draw(canvas, context) {
      //name
      var t = "nebula".split("").join(String.fromCharCode(0x2004));
      context.font = "8vw Poiret One";
      context.fillStyle = 'hsla(216,95%,85%,0.25)';
      context.textBaseline = 'middle';
      context.fillText(t, (canvas.width - context.measureText(t).width) * 0.5, canvas.height * 0.4);

      //desc
      var t = "innovative cloud botting".split("").join(String.fromCharCode(0x2004));
      if (window.innerWidth < 600) {
        context.font = "3.5vw Poiret One";
      } else {
        context.font = "2.5vw Poiret One";

      }
      context.fillStyle = 'hsla(216,95%,85%,0.5)';
      context.textBaseline = 'middle';
      context.fillText(t, (canvas.width - context.measureText(t).width) * 0.5, canvas.height * 0.7);
    }

    function initHeader() {
        width = window.innerWidth;
        height = window.innerHeight;
        target = {x: width/2, y: height/2};

        largeHeader = document.getElementById('large-header');
        largeHeader.style.height = height+'px';

        canvas = document.getElementById('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');

        // create points
        points = [];
        for(var x = 0; x < width; x = x + width/20) {
            for(var y = 0; y < height; y = y + height/20) {
                var px = x + Math.random()*width/20;
                var py = y + Math.random()*height/20;
                var p = {x: px, originX: px, y: py, originY: py };
                points.push(p);
            }
        }

        // for each point find the 5 closest points
        for(var i = 0; i < points.length; i++) {
            var closest = [];
            var p1 = points[i];
            for(var j = 0; j < points.length; j++) {
                var p2 = points[j]
                if(!(p1 == p2)) {
                    var placed = false;
                    for(var k = 0; k < 3; k++) {
                        if(!placed) {
                            if(closest[k] == undefined) {
                                closest[k] = p2;
                                placed = true;
                            }
                        }
                    }

                    for(var k = 0; k < 3; k++) {
                        if(!placed) {
                            if(getDistance(p1, p2) < getDistance(p1, closest[k])) {
                                closest[k] = p2;
                                placed = true;
                            }
                        }
                    }
                }
            }
            p1.closest = closest;
        }

        // assign a circle to each point
        for(var i in points) {
            var c = new Circle(points[i], 2+Math.random()*2, 'rgba(137, 147, 124, 1)');
            points[i].circle = c;
        }

        draw(canvas, ctx);
    }

    // Event handling
    function addListeners() {
        if(!('ontouchstart' in window)) {
            window.addEventListener('mousemove', mouseMove);
        }
        window.addEventListener('scroll', scrollCheck);
        window.addEventListener('resize', resize);
    }


    function mouseMove(e) {
        var posx = posy = 0;
        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        }
        else if (e.clientX || e.clientY)    {
            posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        target.x = posx;
        target.y = posy;
    }

    function scrollCheck() {
        if(document.body.scrollTop > height) animateHeader = false;
        else animateHeader = true;
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        largeHeader.style.height = height+'px';
        canvas.width = width;
        canvas.height = height;
    }

    // animation
    function initAnimation() {
        animate();
        for(var i in points) {
            shiftPoint(points[i]);
        }
    }

    function animate() {
        if(animateHeader) {
            ctx.clearRect(0,0,width,height);
            draw(canvas, ctx);
            for(var i in points) {
                // detect points in range
                if(Math.abs(getDistance(target, points[i])) < 4000) {
                    points[i].active = 0.3;
                    points[i].circle.active = 0.6;
                } else if(Math.abs(getDistance(target, points[i])) < 20000) {
                    points[i].active = 0.1;
                    points[i].circle.active = 0.3;
                } else if(Math.abs(getDistance(target, points[i])) < 40000) {
                    points[i].active = 0.02;
                    points[i].circle.active = 0.1;
                } else {
                    points[i].active = 0;
                    points[i].circle.active = 0;
                }

                drawLines(points[i]);
                points[i].circle.draw();
            }
        }
        requestAnimationFrame(animate);
    }

    function shiftPoint(p) {
        TweenLite.to(p, 1+1*Math.random(), {x:p.originX-50+Math.random()*100,
            y: p.originY-50+Math.random()*100, ease:Circ.easeInOut,
            onComplete: function() {
                shiftPoint(p);
            }});
    }

    // Canvas manipulation
    function drawLines(p) {
        if(!p.active) return;
        for(var i in p.closest) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.closest[i].x, p.closest[i].y);
            ctx.strokeStyle = 'rgba(56, 63, 74,'+ p.active+')';
            ctx.stroke();
        }
    }

    function Circle(pos,rad,color) {
        var _this = this;

        // constructor
        (function() {
            _this.pos = pos || null;
            _this.radius = rad || null;
            _this.color = color || null;
        })();

        this.draw = function() {
            if(!_this.active) return;
            ctx.beginPath();
            ctx.arc(_this.pos.x, _this.pos.y, _this.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'rgba(56, 63, 74,'+ _this.active+')';
            ctx.fill();
        };
    }

    // Util
    function getDistance(p1, p2) {
        return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    }
    
})();

//menu toggle
function openMenu(){
    var menu = $('.overlay');
    var b = $('#before');
    var a = $('#after');
    if(!menu.hasClass('active')) {
        b.fadeOut(); a.fadeIn();
        menu.fadeIn().toggleClass('active');
    } else {
        
        b.fadeIn(); a.fadeOut();
        menu.fadeOut().removeClass('active');
    }
}

function removeAutofill() {

    var is_chrome = navigator.userAgent.indexOf('Chrome') > -1;
    var is_explorer = navigator.userAgent.indexOf('MSIE') > -1;
    var is_firefox = navigator.userAgent.indexOf('Firefox') > -1;
    var is_safari = navigator.userAgent.indexOf("Safari") > -1;
    var is_opera = navigator.userAgent.toLowerCase().indexOf("op") > -1;

    if ((is_chrome)&&(is_safari)) { is_safari = false; }
    if ((is_chrome)&&(is_opera)) { is_chrome = false; }


    if (is_safari) {
        window.setInterval(function(){
            $('input:-webkit-autofill').each(function() {
                var clone = $(this).clone(true, true);
                $(this).after(clone).remove();
            });
        }, 20);
    }
}


$("#form").submit(function(e) {
    e.preventDefault();
    validateForm();
});

function writeUserData(email) {
    //find a way to prevent duplicates
    firebase.database().ref('users/').push(email);
    $('#email').prop('readonly', true);
    $('#submit').remove();
    $('input[name=email]').val('THANKS');
}

function validateForm() {
    var email = document.forms["email-form"]["email"].value;
    var exists = users.indexOf(email);
    if (email !== "" && exists === -1) {
        writeUserData(email);
        return true;
    } else {
        if (exists) {
            $('input[name=email]').val('Already Registered');
            $('#email').prop('readonly', true);
            $('#submit').remove();
        }
        return false;
    }
}

function getUsers() {

    firebase.database().ref('users/').on("value", function(snapshot) {
        snapshot.forEach(function(child) {
            var key = child.key;
            var val = child.val();
            users.add(key, val);
            console.log(key, val);
        });

    }, function(errorObject) {
        console.log("failed to read: " + errorObject.code);
    });
}

function LinkedList() { 
  var length = 0; 
  var head = null; 

  var Node = function(key, val){
    this.key = key;
    this.val = val;
    this.next = null; 
  }; 

  this.size = function(){
    return length;
  };

  this.head = function(){
    return head;
  };

  this.add = function(key, val){
    var node = new Node(key, val);
    if(head === null){
        head = node;
    } else {
        var currentNode = head;

        while(currentNode.next){
            currentNode  = currentNode.next;
        }

        currentNode.next = node;
    }

    length++;
  }; 

  this.remove = function(key){
    var currentNode = head;
    var previousNode;
    if(currentNode.key === key){
        head = currentNode.next;
    } else {
        while(currentNode.key !== key) {
            previousNode = currentNode;
            currentNode = currentNode.next;
        }

        previousNode.next = currentNode.next;
    }

    length --;
  };
  
  this.isEmpty = function() {
    return length === 0;
  };

  this.indexOf = function(val) {
    var currentNode = head;
    var index = -1;

    console.log(val);

    while(currentNode){
        index++;
        console.log(currentNode.val);
        if(currentNode.val === val){
            return index;
        }
        currentNode = currentNode.next;
    }

    return -1;
  };

  this.elementAt = function(index) {
    var currentNode = head;
    var count = 0;
    while (count < index){
        count ++;
        currentNode = currentNode.next
    }
    return currentNode.val;
  };
  
  this.removeAt = function(index) {
    var currentNode = head;
    var previousNode;
    var currentIndex = 0;
    if (index < 0 || index >= length){
        return null
    }
    if(index === 0){
        head = currentNode.next;
    } else {
        while(currentIndex < index) {
            currentIndex ++;
            previousNode = currentNode;
            currentNode = currentNode.next;
        }
        previousNode.next = currentNode.next
    }
    length--;
    return currentNode.key;
  }

} 

var users = new LinkedList();

getUsers();
