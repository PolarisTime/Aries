(function debugHeightChain() {
  function h(sel) { var e = document.querySelector(sel); return e ? e.clientHeight : -1 }

  function show() {
    var m = h('.leo-main')
    console.clear()
    console.log('视口: ' + window.innerWidth + 'x' + window.innerHeight + '  leo-main(100dvh): ' + m)
    console.log('')
    console.log('── 上游父级 ──')
    console.log('leo-content         clientH=' + h('.leo-content'))
    console.log('leo-content-inner   clientH=' + h('.leo-content-inner'))
    console.log('page-stack          clientH=' + h('.page-stack'))
    console.log('module-grid-card    clientH=' + h('.module-grid-card'))
    console.log('ant-card-body       clientH=' + h('.ant-card-body'))
    console.log('')
    console.log('── 表格容器 ──')
    console.log('module-table-shell  clientH=' + h('.module-table-shell'))

    // 实际 DOM 探路
    var sc = document.querySelector('.module-table-shell .ant-spin-container')
    if (sc) {
      var p = sc.parentElement
      console.log('ant-spin-container   clientH=' + sc.clientHeight)
      console.log('  父级元素:', p ? (p.tagName + '.' + p.className.replace(/ /g, '.')) : 'NONE')
      console.log('  父级 clientH:', p ? p.clientHeight : -1)
      console.log('  父级 computed display:', p ? getComputedStyle(p).display : 'N/A')
      console.log('  父级 computed flex:', p ? getComputedStyle(p).flex : 'N/A')
      if (p) {
        var pp = p.parentElement
        console.log('  祖父元素:', pp ? (pp.tagName + '.' + pp.className.replace(/ /g, '.')) : 'NONE')
        console.log('  祖父 clientH:', pp ? pp.clientHeight : -1)
        console.log('  祖父 computed display:', pp ? getComputedStyle(pp).display : 'N/A')
        console.log('  祖父 computed flex:', pp ? getComputedStyle(pp).flex : 'N/A')
      }
    } else {
      console.log('ant-spin-container   NOT FOUND')
    }

    console.log('ant-table-wrapper   clientH=' + h('.module-table-shell .ant-table-wrapper'))
    console.log('ant-table           clientH=' + h('.module-table-shell .ant-table'))
    console.log('ant-table-body      clientH=' + h('.module-table-shell .ant-table-body'))
    console.log('')
    var s = h('.module-table-shell')
    console.log('shell/leo-main = ' + s + '/' + m + ' = ' + (m>0?(s/m*100).toFixed(1):0) + '%')
  }

  show()
  var t = 0
  window.addEventListener('resize', function() { clearTimeout(t); t = setTimeout(show, 200) })
  console.log('已监听 resize，输入 debugHeightChain() 手动刷新')
})()
