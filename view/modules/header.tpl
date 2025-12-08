  <head>
    <meta charset="UTF-8" />
    <base href="{{viteTarget}}" />
    {% include "./initial_state.tpl" %}   
    <link rel="icon" href="{{prefix}}/public/favicon.png" />    
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>数据库管理</title>
    <meta name="description" content="{{description}}">
    <script>
      window.addEventListener('vite:preloadError', function (event) {
        console.error(event);
      });
    </script> 
  </head>