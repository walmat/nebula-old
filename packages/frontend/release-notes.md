## Version 1.1.0
Included in this major version is a AWS proxy generator, task overhaul, monitor overhaul, bot protection updates, proxy groupings (soon!), and an overall rewrite of the application state management and quality of life.
### Proxy Generator
For now, AWS is the only provider that I included in this update. I will soon add other providers and even a way to add datacenter proxies that mask their IPs to be residential. For more information on how to use the proxy generator, please ask.
### Task/Monitor Overhaul
In order to provide you guys with greater chances of securing as many pairs as possible, I wanted to make sure the app was seamless. This meant that there was (virtually) no lag and no downtime in the app itself. In order to do so, I had to overhaul the way I was thinking about tasks. Now, each task gets put into a group based on the site it's monitoring on. If the product data is the same, it will be grouped into the other task running on that site, and only one monitor will ping that site. However, if the keywords/url/variant is different, it will add the product info group into it, but still **only** ping the site once while offloading the matching algorithm onto a separate thread. All in all: faster checkouts, way less proxy usage, and even less memory usage.
### Proxy Groups
You will be able to add proxies in groups. Nothing much is changing here except that the groups perform as a way to assign them to certain tasks. This way, if you want to run some residential proxies on some tasks, and some datacenter on others, it's now possible.
### State Management Rewrite
I've transitioned over into using redux saga to handle all side effects that could happen from state transitions. Now, all API data is offloaded onto a separate thread and called in a saga. This has been tested by me and has shown to be better at UI responsiveness, so hopefully that holds up as well.
### Bot Protection
In order to fight Shopify and their new anti-pattern for bot protection, I'll be pushing out more frequent updates on the fly. I've been collecting data and implemented some changes into this update that I can't speak too heavily on yet, but be on the lookout for more soon. Both yeezy day and today's kith x coca-cola drop helped me make huge improvements.
