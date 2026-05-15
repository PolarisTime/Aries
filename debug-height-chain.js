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
    console.log('ant-spin-n-loading  clientH=' + h('.module-table-shell .ant-spin-nested-loading'))
    console.log('ant-spin-container   clientH=' + h('.module-table-shell .ant-spin-container'))
    console.log('ant-table-wrapper   clientH=' + h('.module-table-shell .ant-table-wrapper'))
    console.log('ant-table           clientH=' + h('.module-table-shell .ant-table'))
    console.log('ant-table-body      clientH=' + h('.module-table-shell .ant-table-body'))
    console.log('')
    var s = h('.module-table-shell')
    console.log('📐 shell/leo-main = ' + s + '/' + m + ' = ' + (m>0?(s/m*100).toFixed(1):0) + '%')
  }

  show()
  var t = 0
  window.addEventListener('resize', function() { clearTimeout(t); t = setTimeout(show, 200) })
  console.log('🔁 已监听 resize，输入 debugHeightChain() 手动刷新')
})()
