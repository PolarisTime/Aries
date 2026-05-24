(function debugHeightChain() {
  function h(sel) { var e = document.querySelector(sel); return e ? e.clientHeight : -1 }
  function cs(sel, prop) { var e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : 'N/A' }

  function show() {
    var m = h('.leo-main')
    console.clear()
    console.log('视口: ' + window.innerWidth + 'x' + window.innerHeight + '  leo-main: ' + m)
    console.log('')

    var items = [
      ['leo-content', h('.leo-content'), cs('.leo-content','height')],
      ['leo-content-inner', h('.leo-content-inner'), cs('.leo-content-inner','height')],
      ['page-stack', h('.page-stack'), cs('.page-stack','flex')],
      ['module-grid-card', h('.module-grid-card'), cs('.module-grid-card','flex')],
      ['ant-card-body', h('.ant-card-body'), cs('.ant-card-body','flex')],
      ['module-table-shell', h('.module-table-shell'), cs('.module-table-shell','flex')],
      ['ant-spin', h('.module-table-shell .ant-spin'), cs('.module-table-shell .ant-spin','flex')],
      ['ant-spin-container', h('.module-table-shell .ant-spin-container'), cs('.module-table-shell .ant-spin-container','flex')],
      ['ant-table-wrapper', h('.module-table-shell .ant-table-wrapper'), cs('.module-table-shell .ant-table-wrapper','flex')],
      ['ant-table', h('.module-table-shell .ant-table'), cs('.module-table-shell .ant-table','flex')],
      ['ant-table-body', h('.module-table-shell .ant-table-body'), cs('.module-table-shell .ant-table-body','overflow')],
    ]

    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      var gap = ''
      if (i > 0) {
        var prev = items[i-1][1]
        var diff = prev - item[1]
        if (diff > 2 || diff < -2) gap = ' ← ' + (diff > 0 ? '-' : '+') + Math.abs(diff)
      }
      console.log(item[0].padEnd(22) + ' H=' + item[1] + '  ' + item[2] + gap)
    }

    // Detailed ant-spin-container children
    console.log('')
    console.log('── ant-spin-container 内部 ──')
    var sc = document.querySelector('.module-table-shell .ant-spin-container')
    if (sc) {
      var cs2 = getComputedStyle(sc)
      console.log('  display:', cs2.display, ' flex:', cs2.flex, ' overflow:', cs2.overflow)
      console.log('  scrollHeight:', sc.scrollHeight, ' clientHeight:', sc.clientHeight)
      console.log('  children:')
      for (var j = 0; j < sc.children.length; j++) {
        var c = sc.children[j]
        console.log('    ' + c.tagName + '.' + (c.className || '').split(' ').slice(0,2).join('.'), 'H=' + c.clientHeight)
      }
    }
  }

  show()
  var t = 0
  window.addEventListener('resize', function() { clearTimeout(t); t = setTimeout(show, 200) })
  console.log('已监听 resize，输入 debugHeightChain() 手动刷新')
})()
