/*
    作者: imoki
    仓库: https://github.com/imoki/
    公众号：默库
    更新时间：20240726
    脚本：moku.js 粘贴到金山文档内时，请改名为“默库”。
    说明：注意！请将文档名和脚本名都起名为“默库”，脚本才能正常运行。
          1. 第一步，首次运行“默库”脚本（仓库中的“moku.js”）会生成wps表，请先填写好wps表的内容，只填wps_sid即可。
          2. 填写CONFIG表的内容。默认任务1用于消息推送测试，测试脚本是否正常，填写推送的key即可，如:bark=xxxx&pushplus=xxxx。(这一步可以跳过)
          3. 再运行一次“默库”脚本，此时你将收到推送通知，说明你操作正确，可正常使用了。(这一步可以跳过)
          4. 请在CONFIG表填写你自己写的python脚本和定时时间，然后运行一次“默库”脚本，即可按照配置好的来执行脚本，就不需要再管了。
*/

var sheetNameSubConfig = "wps"; // 分配置表名称
var sheetNameConfig = "CONFIG"
var sheetName = "默库"
var cookie = ""
var taskArray = []
var headers = ""
var count = "20" // 读取的文档页数
var excludeDocs = []
var onlyDocs = [] // 仅读取哪些文档
// 表中激活的区域的行数和列数
var row = 0;
var col = 0;
var maxRow = 100; // 规定最大行
var maxCol = 26; // 规定最大列
var workbook = [] // 存储已存在表数组
var colNum = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']

// 定时任务相关
var hourMin = 0
var hourMax = 23
var cron_type = "daily"
var day_of_month = 0
var day_of_week = 0
var task_id = 0 // 定时任务id
var asid = 0

// 注入脚本
var file_id = 0;
var script_id = 0;

function sleep(d) {
  for (var t = Date.now(); Date.now() - t <= d; );
}

// ======================生成表修改相关开始======================
// 激活工作表函数
function ActivateSheet(sheetName) {
    let flag = 0;
    try {
      // 激活工作表
      let sheet = Application.Sheets.Item(sheetName);
      sheet.Activate();
      // console.log("🥚 激活工作表：" + sheet.Name);
      flag = 1;
    } catch {
      flag = 0;
      console.log("🍳 无法激活工作表，工作表可能不存在");
    }
    return flag;
}

// 存储已存在的表
function storeWorkbook() {
  // 工作簿（Workbook）中所有工作表（Sheet）的集合,下面两种写法是一样的
  let sheets = Application.ActiveWorkbook.Sheets
  sheets = Application.Sheets

  // 清空数组
  workbook.length = 0

  // 打印所有工作表的名称
  for (let i = 1; i <= sheets.Count; i++) {
    workbook[i - 1] = (sheets.Item(i).Name)
    // console.log(workbook[i-1])
  }
}

// 判断表是否已存在
function workbookComp(name) {
  let flag = 0;
  let length = workbook.length
  for (let i = 0; i < length; i++) {
    if (workbook[i] == name) {
      flag = 1;
      console.log("✨ " + name + "表已存在")
      break
    }
  }
  return flag
}

// 创建表，若表已存在则不创建，直接写入数据
function createSheet(name) {
  // const defaultName = Application.Sheets.DefaultNewSheetName
  // 工作表对象
  if (!workbookComp(name)) {
    Application.Sheets.Add(
      null,
      Application.ActiveSheet.Name,
      1,
      Application.Enum.XlSheetType.xlWorksheet,
      name
    )
  }
}

// 判断表格行列数，并记录目前已写入的表格行列数。目的是为了不覆盖原有数据，便于更新
function determineRowCol() {
  for (let i = 1; i < maxRow; i++) {
    let content = Application.Range("A" + i).Text
    if (content == "")  // 如果为空行，则提前结束读取
    {
      row = i - 1;  // 记录的是存在数据所在的行
      break;
    }
  }
  // 超过最大行了，认为row为0，从头开始
  let length = colNum.length
  for (let i = 1; i <= length; i++) {
    content = Application.Range(colNum[i - 1] + "1").Text
    if (content == "")  // 如果为空行，则提前结束读取
    {
      col = i - 1;  // 记录的是存在数据所在的行
      break;
    }
  }
  // 超过最大行了，认为col为0，从头开始

  // console.log("✨ 当前激活表已存在：" + row + "行，" + col + "列")
}

// 统一编辑表函数
function editConfigSheet(content) {
  determineRowCol();
  let lengthRow = content.length
  let lengthCol = content[0].length
  if (row == 0) { // 如果行数为0，认为是空表,开始写表头
    for (let i = 0; i < lengthCol; i++) {
      Application.Range(colNum[i] + 1).Value = content[0][i]
    }

    row += 1; // 让行数加1，代表写入了表头。
  }

  // 从已写入的行的后一行开始逐行写入数据
  // 先写行
  for (let i = 1 + row; i <= lengthRow; i++) {  // 从未写入区域开始写
    for (let j = 0; j < lengthCol; j++) {
      Application.Range(colNum[j] + i).Value = content[i - 1][j]
    }
  }
  // 再写列
  for (let j = col; j < lengthCol; j++) {
    for (let i = 1; i <= lengthRow; i++) {  // 从未写入区域开始写
      Application.Range(colNum[j] + i).Value = content[i - 1][j]
    }
  }
}

// 创建wps表
function createWpsConfig(){
  createSheet(sheetNameSubConfig) // 若wsp表不存在创建wps表
  let flagExitContent = 1

  if(ActivateSheet(sheetNameSubConfig)) // 激活wps配置表
  {
    // wps表内容
    let content = [
      ['wps_sid', '任务配置表超链接', '文档id', 'Pyid', 'Asid', '定时任务id', ],
      ['此处填写wps_sid', "点击此处跳转到" + sheetNameConfig + "表" ,'', '', '', '' ]
    ]
    determineRowCol() // 读取函数
    if(row <= 1 || col < content[0].length){ // 说明是空表或只有表头未填写内容，或者表格有新增列内容则需要先填写
      // console.log(row)
      flagExitContent = 0 // 原先不存在内容，告诉用户先填内容
      editConfigSheet(content)
      // console.log(row)
      let name = "点击此处跳转到" + sheetNameConfig + "表"  // 'CRON'!A1
      let link = sheetNameConfig
      let link_name ='=HYPERLINK("#'+link+'!$A$1","'+name+'")' //设置超链接
      Application.Range("B2").Value = link_name
    }
  }

  return flagExitContent
  
}

// 创建CONFIG表
function createConfig(){
  createSheet(sheetNameConfig) // 若CONFIG表不存在则创建
  let flagExitContent = 1

  if(ActivateSheet(sheetNameConfig)) // 激活配置表
  {
    // CONFIG表内容
    // 推送昵称(推送位置标识)选项：若“是”则推送“账户名称”，若账户名称为空则推送“单元格Ax”，这两种统称为位置标识。若“否”，则不推送位置标识
    // testPythonScript = "import requests\r\n\r\n# 推送\r\ndef push(pushType, key):\r\n  if key != \"\" :\r\n      if pushType.lower() == \"bark\":\r\n        url = \"https://api.day.app/\" + key + \"/运行正常\"\r\n      elif pushType.lower()  == \"pushplus\":\r\n        url = \"http://www.pushplus.plus/send?token=\" + key + \"&content=运行正常\"\r\n      elif pushType.lower()  == \"serverchan\":\r\n        url = \"https://sctapi.ftqq.com/\" + key + \".send?title=运行结果&desp=运行正常\"\r\n      else:\r\n        url = \"https://api.day.app/\" + key + \"/运行正常\"\r\n      response = requests.get(url)\r\n      print(response.text)\r\n\r\n\r\nif __name__ == \"__main__\":\r\n  print(\"这是一段推送测试代码\")\r\n  key = xl(\"k2\", sheet_name=\"CONFIG\")[0][0] # 访问表格\r\n  print(key)\r\n  keyarry = key.split(\"&\")\r\n  for i in range(len(keyarry)):\r\n    pushType = keyarry[i].split(\"=\")[0]\r\n    key = keyarry[i].split(\"=\")[1]\r\n    push(pushType, key)\r\n\r\n\r\n\r\n  \r\n"
    let testKey = "bark=&pushplus=&ServerChan="
    let urlScript = "https://netcut.cn/p/9aa97e54eb186c06"  // 推送测试代码
    let githubProxyScript = "https://raw.kkgithub.com/imoki/wpsPyInf/main/testPush.py" // 代理，测试代码
    let githubScript = "https://github.com/imoki/wpsPyInf/blob/main/testPush.py"  // 直链，测试代码
    let content = [
      ['任务的名称', '备注', '更新时间', '消息', '推送时间', '推送方式',  '是否通知', '是否加入消息池', '是否执行', '脚本', '脚本传入参数', '定时时间', '脚本地址', '脚本唯一id', '脚本密码', '脚本更新时间', '脚本下载模式'],
      ['任务1', '任务1通知', '', '' , '' , '@all' , '是', '否' , '是' , '', testKey, '8:10' , urlScript, '' , '', '', ''],
      ['任务2', '任务2通知', '', '' , '' , '@all' , '是', '否' , '是' , '', testKey, '10:20' , githubProxyScript, '', '', '', 'githubproxy'],
      ['任务3', '任务3通知', '', '' , '' , '@all' , '是', '否' , '是' , '', testKey, '15:00' , githubScript, '', '', '', 'github'],
      ['任务4', '任务4通知', '', '' , '' , '@all' , '是', '否' , '否' , '', '', '17:00' , '', '', '', '', ''],
    ]
    determineRowCol() // 读取函数
    if(row <= 1 || col < content[0].length){ // 说明是空表或只有表头未填写内容，或者表格有新增列内容则需要先填写
      // console.log(row)
      flagExitContent = 0 // 原先不存在内容，告诉用户先填内容
      editConfigSheet(content)
    }
  }
  sleep(3000)

  return flagExitContent
}



// 获取wps_sid、cookie
function getWpsSid(){
  // flagConfig = ActivateSheet(sheetNameSubConfig); // 激活wps配置表
  // 主配置工作表存在
  if (1) {
    console.log("🍳 开始读取" + sheetNameSubConfig + "配置表");
    for (let i = 2; i <= 100; i++) {
      // 读取wps表格配置
      wps_sid = Application.Range("A" + i).Text; // 以第一个wps为准
      // name = Application.Range("H" + i).Text;
      
      excludeDocs = Application.Range("C" + i).Text.split("&")
      onlyDocs = Application.Range("D" + i).Text.split("&")

      break
    }
  }
  return wps_sid
  // filename = name
}


// ======================生成表修改相关结束======================


// ======================文档检索相关开始======================

// 判断是否为xlsx文件
function juiceXLSX(name){
  let flag = 0
  let array= name.split(".") // 使用|作为分隔符
  if(array.length == 2 && (array[1] == "xlsx" || array[1] == "ksheet")){
    flag = 1
  }
  return flag 
}

// 判断是否为要排除文件
function juiceDocs(name){
  let flag = 0
  if((excludeDocs.length == 1 && excludeDocs[0] == "") || excludeDocs.length == 0){
    flag = 0
    // console.log("excludeDocs不符合")
  }else{
    for(let i= 0; i<excludeDocs.length; i++){
      if(name == excludeDocs[i]){
        flag = 1  // 找到要排除的文档了
        // console.log("找到要排除的文档了")
      }
    }
  }
  return flag 
}

// 判断是否为仅读取的文档
function juiceOnlyRead(name){
  let flag = 0  // 不读取
  if(onlyDocs == "@all"){
    flag = 1  // 所有都读取
    // console.log("所有都读取")
  }else{
    for(let i= 0; i<onlyDocs.length; i++){
      if(name == onlyDocs[i]){
        flag = 1  // 找到要读取的文档了
        // console.log("找到要读取的文档了")
      }
    }
  }
  
  return flag 
}

// 判断是否存在定时任务
function taskExist(file_id){
  url = "https://www.kdocs.cn/api/v3/ide/file/" + file_id + "/cron_tasks";
  // console.log(url)
  // 查看定时任务
  resp = HTTP.get(
    url,
    { headers: headers }
  );

  resp = resp.json()
  // console.log(resp)
  // list -> 数组 -> file_id、task_id、script_name，cron_detail->字典
  cronlist = resp["list"]
  sleep(3000)
  return cronlist
}

// 获取file_id
function getFile(url){
  let flag = 0
  // 查看定时任务
  resp = HTTP.get(
    url,
    { headers: headers }
  );

  resp = resp.json()
  // console.log(resp)
  resplist = resp["list"]
  for(let i = 0; i<resplist.length; i++){
    roaming = resplist[i]["roaming"]
    // console.log(roaming)
    fileid = roaming["fileid"]
    name = roaming["name"]
    // 找到指定文档
    if(juiceXLSX(name) && sheetName == name.split(".")[0]){
      console.log("✨ 已找到" + sheetName + "文档")
      file_id = fileid
      flag = 1
      break;  // 找到就退出
    }
  }

  // console.log(taskArray)
  sleep(3000)
  return flag
}

// 判断是否存在某脚本，写入script_id
function existPythonScript(){
  let flagFind = 0
  list = pyScriptList(file_id)
  // console.log(list)
  // {
  //     "data": [
  //         {
  //             "id": "V7-xxxxx",
  //             "script_name": "a",
  //             "view_config": "",
  //             "update_at": ,
  //             "edit_permission": 1,
  //             "is_admin": true,
  //             "read_only": false,
  //             "creator_id": "",
  //             "creator_name": "",
  //             "create_time": ,
  //             "last_modifier_id": "",
  //             "last_modifier_name": "",
  //             "last_modify_time": 
  //         }
  //     ]
  // }
  if(list != undefined){
    if(list.length > 0){
      console.log("🎉 存在python任务")
      // console.log(list)
      for(let i = 0; i < list.length; i++){
        
        task = list[i]
        let id = task["id"]
        script_name = task["script_name"]

        // 查找是否有指定脚本
        if(script_name == sheetName){
          console.log("🎉 存在" + sheetName + "脚本")
          script_id = id
          // taskArray.push({
          //   "filename" : name,
          //   "fileid" : fileid,
          //   "script_id" : script_id,
          //   "script_name" : script_name,
          // })

          flagFind = 1
          break;
        }

    }
    
    }
  }

  return flagFind
}

// 获取airScipt_id
function getAsId(){
  url = "https://www.kdocs.cn/api/v3/ide/file/" + file_id + "/script"
  // console.log(url)
  // 创建定时任务
  resp = HTTP.get(
    url,
    { headers: headers }
  );

  resp = resp.json()
  // console.log(resp)
  let list = resp["data"]
  for(let i = 0; i<list.length; i++){
    let name = list[i].script_name
    if(name == sheetName){
      asid =  list[i].id
      console.log("✨ 写入找到Asid:" + asid)
    }
  }

  sleep(5000)
}

// 初始化，无文档id和脚本id的时候使用
function init(){
  // 判断是否以前已写入数据
  if(ActivateSheet(sheetNameSubConfig)) // 激活wps配置表
  {
    // 定时任务id
    task_id = Application.Range("F2").Value
    
    // 读取文档id
    file_id = Application.Range("C2").Value
    // console.log(file_id)
    if(file_id != "" && file_id != 0 && file_id != null){
      console.log("✨ 已读取文档id")
    }else{
      // 无文档id，则写入文档id

      // 获取文档id
      url = "https://drive.kdocs.cn/api/v5/roaming?count=" + count  // 只对前20条进行判断
      let flagFindFileid = getFile(url)
      if(flagFindFileid == 0){
        console.log("📢 请将本文档名称更改为 " + sheetName + " 然后再运行一次脚本")
      }else{
        // 有文档id了
        // 写入文档id
        console.log("✨ 写入文档id")
        let pos = 2
        Application.Range(colNum[2] + pos).Value = file_id
      }
    }
    
    // console.log(file_id)
    if(file_id != "" && file_id != 0){
      // 读取脚本id
      let i = 2
      script_id = Application.Range("D" + i).Text
      if(script_id != "" && script_id != 0){
        console.log("✨ 已获取到" + sheetName + "脚本")
      }else{
        // 无指定脚本，可能是第一次运行或清空了id，则进行数据写入以及py脚本创建

        // 若是清空了id，脚本还存在，则不创建脚本仅写入id
        let flagFind = existPythonScript()  // 判断是否存在指定脚本
        if(flagFind){
          // 说明已有所需py脚本
          Application.Range(colNum[3] + "2").Value = script_id
          console.log("✨ 已有" + sheetName + "脚本，写入最新id")
        }else{
          // 无指定的脚本，是第一次运行，则进行数据写入以及py脚本创建
          
          // 第一次运行  
          url = "https://www.kdocs.cn/api/v3/ide/file/" +file_id + "/script"
          script_id = createPyScript(url, headers)  // 创建脚本
          // console.log(script_id)

          // 写入脚本id
          let pos = 2
          Application.Range(colNum[3] + pos).Value = script_id
          console.log("✨ 已创建" + sheetName + "脚本")
          console.log("✨ 请将" + sheetName + "脚本加入定时任务")
        }

        // 赋予网络api权限
        change_permission_config()

        // 允许网路请求
        permissionOn()

      }

      asid = Application.Range("E2").Value
      // console.log(asid)
      // 如果没有asid
      if(asid == "" || asid == "undefined" || asid == null){
        getAsId()
        Application.Range("E2").Value = asid
      }
      // console.log(asid)
    }
  }
}

// ======================文档检索相关结束======================


// ======================定时任务相关开始======================
// 修改定时任务
function putTask(url, headers, data, task_id, script_name){
  let flagResult = 0
  if(task_id == "undefined" || task_id == null || task_id == ""){
    console.log("🎉 创建" + sheetName + "定时任务")
    // 创建定时任务
    resp = HTTP.post(
      url,
      data,
      { headers: headers }
    );
  }else{
    // 修改定时任务
    resp = HTTP.put(
      url + "/" + task_id,
      data,
      { headers: headers }
    );
  }

  resp = resp.json()
  // console.log(resp)

  // {"result":"ok"}
  // {"errno":10000,"msg":"not find script","reason":"","result":"InvalidArgument"}
  // {"errno":10000,"msg":"value of hour is out of 24's bounds","reason":"","result":"InvalidArgument"}
  // {"errno":10000,"msg":"status not allow","reason":"","result":"InvalidArgument"}
  // {"task_id":""}
  result = resp["result"]
  if(result == "ok"){
    console.log("🎉 " + script_name + " 任务时间调整成功")
    flagResult = 1
  }else{
    task_id = resp["task_id"]
    // console.log(task_id)
    if(task_id != "undefined" || task_id == null){
      // console.log("task_id不为空")
      return task_id
    }else{
      msg = resp["msg"]
      console.log("📢 " , msg)
    }

  }
  sleep(5000)
  return flagResult
}

// 返回当前月和星期几
function getMonthWeek(){
  let mw = []
  let date = new Date();
  let weekdayIndex = date.getDay(); // getDay()返回的是0（星期日）到6（星期六）之间的一个整数
  mw[0] = date.getDate().toString()
  mw[1] = weekdayIndex.toString()
  // 周日是0
  // if(mw[1] == "0"){ // 星期日返回7
  //   mw[1] = 7
  // }
  return mw
}

// 获取系统时分
function getsysHM(){
  let syshm = []
  let currentDate = new Date();
  // 获取小时（注意：getHours() 返回的是 0-23 之间的数）
  let syshours = currentDate.getHours();
  // 获取分钟（getMinutes() 返回的是 0-59 之间的数）
  let sysminutes = currentDate.getMinutes();
  // // 获取秒（getSeconds() 返回的是 0-59 之间的数）
  // let sysseconds = currentDate.getSeconds();
  // 如果需要两位数的小时、分钟或秒，可以使用 padStart() 方法来填充前导零
  syshours = syshours.toString().padStart(2, '0');
  sysminutes = sysminutes.toString().padStart(2, '0');
  // sysseconds = seconds.toString().padStart(2, '0');

  syshm[0] = parseInt(syshours)
  syshm[1] = parseInt(sysminutes)
  return syshm
}

// 数组字符串转整形
function arraystrToint(array){
  let result = []
  for(let i=0; i<array.length; i++){
    result.push(parseInt(array[i]))
  }
  return result
}

// 数组升序排序
function arraySortUp(value){
  value.sort(function(a, b) {
    return a - b; // 升序排序
  });
  return value
}

// 数组-字典字符串转整形
function dictarraystrToint(array){
  let result = []
  for(let i=0; i<array.length; i++){
    result.push({
        "hour" : parseInt(array[i]["hour"]),
        "minute" : parseInt(array[i]["minute"]),
        "pos" : array[i]["pos"],
        // "flagExec" : array[i]["flagExec"],
      })
  }
  return result
}

// 数组-字典升序排序，按分
function dictarraySortUpMinute(value){
  value.sort(function(a, b) {
    // console.log(a, b)
    return a["minute"] - b["minute"]; // 升序排序
  });
  return value
}

// 数组-字典升序排序，按时
function dictarraySortUpHour(value){
  value.sort(function(a, b) {
    // console.log(a, b)
    return a["hour"] - b["hour"]; // 升序排序
  });
  return value
}

// 格式化时间。为：2024/7/23 10:01
function formatDate(dateStr) {
    // 假设dateStr是有效的日期字符串，格式为"YYYY-MM-DD HH:mm:ss"
    // 使用split方法将日期字符串拆分为年、月、日、时、分、秒
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');

    const formattedMonth = month.replace(/^0/, ''); // 删除月份的前导零（如果有）
    const formattedDay = day.replace(/^0/, ''); // 删除日期的前导零（如果有）

    // 使用数组元素构建新的日期字符串，时间只取到时
    const formattedDate = `${year}/${formattedMonth}/${formattedDay} ${hour}:${minute}`;

    return formattedDate;
}
// ======================定时任务相关结束======================

// ======================PYTHON处理相关开始======================

// python脚本列表
function pyScriptList(file_id){
  let url = "https://www.kdocs.cn/api/v3/ide/file/" + file_id + "/script?ext=py"
  // console.log(url)
  // 查看定时任务
  let resp = HTTP.get(
    url,
    { headers: headers }
  );

  resp = resp.json()
  // console.log(resp)

  let list = resp["data"]
  sleep(3000)
  return list
}

// 创建脚本
function createPyScript(url, headers){
  data = {"script_name": sheetName,"script":"","ext":"py"}
  let resp = HTTP.post(
    url,
    data,
    { headers: headers }
  );
  // {"id":""}
  resp = resp.json()
  id = resp["id"]

  return id
}


// 执行脚本
function runScript(url, headers, script){
  let data = {"sheet_name":"CONFIG","script":script}
  let resp = HTTP.post(
      url,
      data,
      { headers: headers },
  );
  resp = resp.json()
  // {"data":{"grant":{"need":[{"name":"http","open":true},{"name":"smtp","open":true}]}},"result":"ok"}
  // {"err_detail":{},"errmsg":"服务异常，请稍后重试或联系客服（40101）","hint":"用户无权限","message":"UserUnauthorized"}
  // console.log(resp)
  let result = resp["result"]
  return result
}

// 权限允许
function permissionOn(){
  url = "https://www.kdocs.cn/api/v3/ide/file/" + file_id + "/script/" + script_id + "/permission"
  resp = HTTP.post(
    url,
    data,
    { headers: headers }
  );
  // 404 page not found
  // console.log(resp.text())
  resp = resp.json()
  // console.log(resp)

  result = resp["result"]
  if(result == "ok"){
    console.log("🎉 已允许网络请求")
  }else{
     console.log("📢 请手动赋予网络API权限，并点击运行，再点击允许网络请求")
  }
  sleep(5000)
}

// 赋予网络api权限
function change_permission_config(){
  url = "https://www.kdocs.cn/api/v3/ide/file/" + file_id + "/script/" + script_id
 
  data = {
      "change_permission_config": true,
      "id": script_id,
      "permission_config": {
          "ks_drive": {
              "open": false,
              "allow_open_all_file": false,
              "allow_open_files": null
          },
          "http": {
              "open": true,
              "allow_all_host": true,
              "allow_hosts": null
          },
          "smtp": {
              "open": true,
              "allow_all_email": true,
              "allow_emails": null
          },
          "sql": {
              "open": false
          }
      }
  }

  //  console.log(url)
  //  console.log(data)
  resp = HTTP.put(
    url,
    data,
    { headers: headers }
  );
  // 404 page not found
  // console.log(resp.text())
  resp = resp.json()
  // console.log(resp)

  result = resp["result"]
  if(result == "ok"){
    console.log("🎉 成功赋予网络API权限")
  }else{
     console.log("📢 请手动赋予网络API权限")
  }
  sleep(5000)
  // return flagResult
}

// ======================PYTHON处理相关结束======================


// ======================远程脚本相关开始======================
// 从url获取noteid
function getnoteid(url){
  note_id = url.split("/")
  note_id = note_id[note_id.length - 1]
  return note_id
}

// 判断url类型，取域名
function geturlType(url){
  result = url.split("/")
  // console.log(result)
  result = result[2]
  return result
}

// 取唯一id
function getUniqueId(value){
  let uniqueIdStr = "uniqueId=\""
  let uniqueId = ""
  // 去除内容中的所有空格，但保留换行符
  value = value.replace(/ +/g, ''); // 使用正则表达式替换所有空格

  // dict = {
  //   "value" : value
  // }
  // console.log(dict)

  let startIndex = value.indexOf(uniqueIdStr) + uniqueIdStr.length; // "idUnique="
  let endIndex = value.indexOf('"', startIndex); // 从startIndex开始找到换行符的位置
  if (endIndex === -1) {  // 如果endIndex是-1，说明没有找到换行符，可能整行就是idUnique的值
      // 提取整个剩余部分
      uniqueId = value.substring(startIndex).trim();
  } else {
      // 提取"idUnique="和换行符之间的内容
      uniqueId = value.substring(startIndex, endIndex).trim();
  }
  // console.log(uniqueId)
  return uniqueId
}

// 判断字符串是否未空，为空返回true
function juiceNull(value){
  if(value == "undefined" || value == null || value == "" || value == undefined || value == "NaN"){
    return true  // 认为值为空
  }else{
    return false
  }

}

// [] -> string， 添加换行，用于GitHub响应处理
function arrayToStr(value){
  let script = ""
  for(let i =0; i<value.length; i++){
    script += value[i] + "\n"
  }
  return script
}

// 获取最新脚本
function getScriptContent(url, downMode){
  // console.log("远程获取最新脚本")
  let result = []
  // console.log(url)
  // console.log(juiceNull(downMode))
  if(geturlType(url) == "netcut.cn" || juiceNull(downMode)){ // https://netcut.cn
    console.log("✨ netcut.cn获取脚本")
    note_id = getnoteid(url)
    url = "https://api.txttool.cn/netcut/note/info/"
    // 查看定时任务
    let headers = {
      "Content-Type": "application/x-www-form-urlencoded", 
    }
    data = {
      "note_id" : note_id
    }
    resp = HTTP.post(
      url,
      data = data,
      { headers: headers }
    );

    resp = resp.json()
    // console.log(resp)
    status = resp["status"]
    if(status == 1){
      // console.log("获取数据成功")
      note_content = resp["data"]["note_content"] // 文本
      updated_time = resp["data"]["updated_time"] // 更新时间
      result[0] = status
      result[1] = note_content  // 自定义脚本内容
      result[2] = formatDate(updated_time)  // 2024-07-20 21:33:22 -> 2024/7/23 10:00
      // console.log(result)
    }else{
      result[0] = status
    }

  }else if(downMode == "githubproxy"){
    console.log("✨ github代理方式获取脚本")
    let headers = {
      // "Content-Type": "application/x-www-form-urlencoded", 
    }
    resp = HTTP.get(
      url,
      { headers: headers }
    );
    resp = resp.text()
    // console.log(resp)
    result[0] = 1
    result[1] = resp  // 自定义脚本内容
    result[2] = Date()  // 2024-07-20 21:33:22
  }else if(downMode == "github"){
    console.log("✨ github直链方式获取脚本")
    let headers = {
      "Accept": "application/json",
    }
    // console.log(url)
    resp = HTTP.get(
      url,
      { headers: headers }
    );
    resp = resp.json()
    // console.log(resp)
    let rawLines = resp["payload"]["blob"]["rawLines"]  // 数组
    let script = arrayToStr(rawLines)
    // console.log(script)
    result[0] = 1
    result[1] = script  // 自定义脚本内容
    result[2] = Date()  // 2024-07-20 21:33:22
  }
  else{
    console.log("未知下载渠道，不进行下载")
    result[0] = 0
  }
  
  return result
}
// ======================远程脚本相关结束======================


// 根据表格创建定时任务任务列表
function createTaskArray(){

}

// 安排定时任务
function schedule(){
    // 找到下一次执行脚本的定时
    // 获取系统时间，比对时间，找到最接近的靠后（右边）的时间，相对则最优先

    // 处理任务列表的时间，记录时分及位置
    // 排序时间
    // 找到靠右最接近的时间，获得此位置。设置为定时。
    
    // 读取生成任务列表
    let pos = 0
    for(let t = 0; t < maxRow; t++){
      pos = t + 2
      script_name = Application.Range(colNum[0] + pos).Text 
      if(script_name == ""){
        break
      }
      flagExec = Application.Range(colNum[8] + pos).Text 
      hm = Application.Range(colNum[11] + pos).Text   // 时间 例如：8:10
      hour = hm.split(":")[0],
      minute = hm.split(":")[1]
      if(flagExec == "是")  // 是否执行，是的才加入任务
      {
        dict = {
          "hour" : hour,
          "minute" : minute,
          "pos" : pos,
          // "flagExec" : flagExec,
        }
        taskArray.push(dict)

      }

    }
    // console.log(taskArray)
    taskArray = dictarraySortUpMinute(taskArray) // 升序排序，按分
    taskArray = dictarraySortUpHour(taskArray)  // 升序排序， 再按时
    taskArray = dictarraystrToint(taskArray)  // 转整形
    // console.log(taskArray)

    // 用于定时的时分
    hour = 0
    minute = 0
    let flagChange = 0
    pos = 0 // 记录位置
    let index = 0 // 计入任务索引，下标

    let syshm = getsysHM()  // 获取系统时间，时分
    let sysminuteSum = syshm[0] * 60 + syshm[1]
    // console.log(sysminuteSum)
    // 查找靠右第一个
    for(let j=0; j < taskArray.length; j++){
      let hourExpect = taskArray[j]["hour"]
      let minuteExpect = taskArray[j]["minute"]
      
      // 用总分钟比较生成值：hour*60 + minute = minuteSum
      minuteSum = hourExpect*60 + minuteExpect
      // console.log("任务时分：", hourExpect, ":" , minuteExpect)
      // console.log("任务总分钟", minuteSum)
      if(sysminuteSum < minuteSum){
        pos = taskArray[j]["pos"]
        index = j
        // 取第一个遇到比原先大的值，就取它
        hour = hourExpect
        // console.log(String(minuteExpect))
        if(String(minuteExpect) == "NaN"){
          // console.log("minuteExpect 为空")
        }else{
          minute = minuteExpect
        }
        
        flagChange = 1
        break
      }
    }
    // console.log(taskArray)
    // 查找最小值
    if(!flagChange){  // 如果时间没变动， 说明当前时间已经时最大了，则置为最小值
      // console.log("时间没变动， 置为最小值")
      pos = taskArray[0]["pos"]
      index = 0
      let hourExpect = taskArray[0]["hour"]
      let minuteExpect = taskArray[0]["minute"]
      hour = hourExpect
      // console.log(String(minuteExpect))
      if(String(minuteExpect) == "NaN"){
        // console.log("minuteExpect 为空")
      }else{
        minute = minuteExpect
      }
    }

    // console.log("任务索引：" , index)
    // console.log("位置：" , pos)
    // console.log("时分：", hour, ":" , minute)
    
    // 定时任务修改
    // 进行时间修改，不存在则修改
    let nw = getMonthWeek()
    day_of_month = nw[0]
    day_of_week = nw[1]
    
    // console.log(url)
    url = "https://www.kdocs.cn/api/v3/ide/file/" + file_id + "/cron_tasks";
    // 写入新的定时任务
    // console.log(task_id)
    if(task_id == "undefined" || task_id == null || task_id == "" || task_id == 0 || task_id == undefined){
      // 无定时任务，直接写新定时任务
      data = {
        "id": file_id.toString(),
        "script_id": asid,
        "cron_detail": {
            "task_type": "cron_task",
            "cron_desc": {
              "cron_type": cron_type,
              "day_of_month": day_of_month.toString(),
              "day_of_week": day_of_week.toString(),
              "hour" : hour.toString(),
              "minute": minute.toString()
            }
        }
      }
    }else{
      // 已有定时任务
      
      data = {
        "id": file_id.toString(),
        "script_id": asid,
        "cron_detail": {
            "task_type": "cron_task",
            "cron_desc": {
                "cron_type": cron_type,
                "day_of_month": day_of_month.toString(),
                "day_of_week": day_of_week.toString(),
                "hour" : hour.toString(),
                "minute": minute.toString()
            }
        },
        "task_id": task_id,
        "status": "enable"
      }
    }
    // console.log(url)
    // console.log(data)

    console.log("✨ 现定时任务：" , script_name, " 定时时间：", hour,":",  minute)
    let flagResult = putTask(url, headers, data, task_id, script_name)
    if(flagResult != 1){ // 返回的是task_id，记录下task_id
      // 写入task_id，定时任务id
      ActivateSheet(sheetNameSubConfig) // 激活wps配置表
      // console.log(flagResult)

      task_id = flagResult
      // console.log(task_id)
      console.log("✨ 写入定时任务id")
      Application.Range("F2").Value = task_id
      ActivateSheet(sheetNameConfig) // 激活CONFIG配置表
    }

    console.log("✨ 已将下一个任务安排进定时任务中")

    return index
}

// 更新脚本及运行脚本
function scriptHandle(){
  // 运行定时任务
  // 取设定时的前一个任务来运行，即当前应该运行的任务
  if(index <= 0){
    pos = taskArray[0]["pos"]
  }else{
    pos = taskArray[index - 1]["pos"]
  }
  // console.log("✨ 执行当前任务位置：" , pos)

  // 安排下一个任务进定时任务中
  // 调用执行py脚本
  console.log("✨ 已获取到" + sheetNameConfig + "表，开始注入任务")

  // 尝试获取最新脚本
  url = Application.Range(colNum[12] + pos).Text 
  // console.log(url)
  if(url == "" || url == null || url == undefined)
  {
    console.log("✨ 读取本地脚本")
    // 如果脚本地址为空，则直接取本地脚本
    script = Application.Range(colNum[9] + pos).Text 
  }else{
    // console.log("下载远程脚本")
    password = Application.Range(colNum[14] + pos).Text 
    excelupdateTime = Application.Range(colNum[15] + pos).Text 
    downMode = Application.Range(colNum[16] + pos).Text // 脚本下载模式
    // console.log(downMode)
    noteScript = getScriptContent(url, downMode) // 获取脚本
    // console.log(noteScript)
    if(noteScript[0] == 1){
      script = noteScript[1]
      scriptUpdateTime = noteScript[2]
      // console.log(scriptUpdateTime)
      // console.log(excelupdateTime)
      // 根据脚本比对脚本更新时间
      if(scriptUpdateTime != excelupdateTime){  // 时间不等，说明要更新脚本
        console.log("✨ 更新时间", scriptUpdateTime)
        console.log("✨ 存在最新脚本，进行脚本更新")
        Application.Range(colNum[9] + pos).Value =  script
        Application.Range(colNum[15] + pos).Value =  scriptUpdateTime
      }else{
        console.log("✨ 已是最新脚本，不进行脚本更新")
      }

    }else{
      // 返回失败，用本地脚本
      // console.log("返回失败，用本地脚本")
      script = Application.Range(colNum[9] + pos).Text 
    }
  }

  // 脚本唯一id，用于python获取脚本位置
  // 从脚本中获取唯一id
  uniqueId = getUniqueId(script)
  // console.log(uniqueId)
  Application.Range(colNum[13] + pos).Value =  uniqueId

  // console.log(script)
  script_name = Application.Range(colNum[1] + pos).Text 
  // console.log(script_name)
  // 执行脚本
  // file_id = parseInt(file_id)
  url = "https://www.kdocs.cn/api/aigc/pyairscript/v2/" + file_id + "/script/" + script_id + "/exec"
  // console.log(url)
  let result = runScript(url, headers, script) // 运行脚本
  
  if(result == "ok"){
    console.log("✨ " + script_name + " 已执行")
  }else{
    console.log("📢 " + script_name + "执行失败")
  }
}

// 运行任务
function runtask(){
  // 根据task表运行任务

  // 判断是否有CONFIG表
  flagConfig = ActivateSheet(sheetNameConfig); // 激活cron配置表

  if(flagConfig != 1){
    console.log("📢 " + sheetNameConfig + "表不存在，已进行创建")
    createConfig()
    flagConfig = 1
  }
  // 主配置工作表存在
  if (flagConfig == 1) {
    // 执行逻辑：先设置新定时， 再执行py脚本
    
    // 设置定时
    index = schedule()
    // console.log(index)

    // 运行脚本，即运行当前定时任务
    scriptHandle(index)

    sleep(3000)
    
  }else{
    // createSheet(sheetNameConfig)  
    console.log("📢 " + sheetNameConfig + "表不存在，已进行创建")
    createConfig()
    // console.log("📢 请先填写" + sheetNameConfig + "表中的内容")
  }


}

// 主程序入口
function main(){
  storeWorkbook()
  let flagExitContent = createWpsConfig()
  if(flagExitContent == 0){
    console.log("📢 请先填写wps表，然后再运行一次此脚本")
    createConfig()  // 第一次运行时，创建CONFIG表
  }else{
    wps_sid = getWpsSid() // 获取wps_sid
    cookie = "wps_sid=" + wps_sid // 获取cookie

    // 全局headers
    headers = {
      "Cookie": cookie,
      "Content-Type" : "application/json",
      "Origin":"https://www.kdocs.cn",
      "Priority":"u=1, i",
    }
    
    // 获取定时任务,生成CRON定时任务表
    init()

    // 执行脚本
    runtask()
  }
}


main()
