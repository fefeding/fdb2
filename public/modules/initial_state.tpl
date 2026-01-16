<script type="text/template" id="__INITIAL_STATE__">
    {{ data | dump | safe }}
</script>
<script type="text/template" id="__DEFAULTINITIAL_STATE__">
  {{ __DEFAULTINITIAL_STATE__ }}
</script>
<script>
  function __get_templateJson(id) {
    try { 
        var tag = document.getElementById(id);
        var obj = JSON.parse(tag.innerHTML);
        return obj;
    }
    catch (e) {    
      return null;
    }
  }
  var __INITIAL_STATE__ = __get_templateJson('__INITIAL_STATE__');
  if(!__INITIAL_STATE__) __INITIAL_STATE__ = __get_templateJson('__DEFAULTINITIAL_STATE__');
  // 动态加载入口
  function __vitejs_load_entry(url, type) {        
        if(!url) return;
        if(url.indexOf('/') !== 0) url = '/' + url;
        var prefix = (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.config && window.__INITIAL_STATE__.config.prefix) || '';
        if(prefix && url.indexOf(prefix) !== 0) {
          url = prefix + url;
        }   
        var nodeObj; 
        switch(type) {
          case 'script': {
            // 检查是否已加载过
            var existing = document.querySelector(`script[src="${url}"]`);   
            if(existing) return; 
            nodeObj = document.createElement('script');
            nodeObj.src = url;
            nodeObj.type = 'module';
            break;
          }
          case 'stylesheet': 
          case 'modulepreload':
          case 'icon':  {
            // 检查是否已加载过
            var existing = document.querySelector(`link[href="${url}"]`);   
            if(existing) return; 
            nodeObj = document.createElement('link');
            nodeObj.href = url;
            nodeObj.rel = type;
            break;
          }
        }  
        if(!nodeObj) return;     
        nodeObj.crossOrigin = 'crossorigin';
        document.head.appendChild(nodeObj);
      }
</script>