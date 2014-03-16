var EXPORTED_SYMBOLS = ["pbCommon"];//"pbCommon.uriList"

var pbCommon = {
Branch : Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService).getBranch("extensions.periodicbrowsing."),
maxTabNum : 0,
sessionIsRestored : false,
alreadyWindowExisting : false,
dayNameList : null,
init : function(){
    this.uriList = this.getUriList();
},
getMaxTabNum : function() {
  var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
                .getService(Components.interfaces.nsISessionStore);
	
	var tmp = JSON.parse(ss.getBrowserState());
  var windowList = tmp["windows"];
  var maxTabNum = 0;
  for(var i=0; i<windowList.length; i++){
    var numTab = windowList[i]["tabs"].length-0;
    if(numTab > maxTabNum) maxTabNum = numTab;
  }

	this.maxTabNum = maxTabNum;
},
getUriList : function(){
    var uriList = JSON.parse(this.Branch.getComplexValue("uriList",
      Components.interfaces.nsISupportsString).data);

    return uriList;
},
setUriList : function(){
    var str = Components.classes["@mozilla.org/supports-string;1"]
          .createInstance(Components.interfaces.nsISupportsString);
    str.data = JSON.stringify(this.uriList);
    this.Branch.setComplexValue("uriList", 
          Components.interfaces.nsISupportsString, str);

    return;
},
getMenuList : function(){
    var menuList = JSON.parse(this.Branch.getCharPref("menuList"));

    return menuList;    
},
setMenuList : function(menuList){
    this.Branch.setCharPref("menuList", JSON.stringify(menuList));
    return; 
},
getLastTimeList : function(){
    var lastTimeList = JSON.parse(this.Branch.getCharPref("lastTimeList"));
    return lastTimeList;
},
setLastTimeList : function(lastTimeList){
    this.Branch.setCharPref("lastTimeList", JSON.stringify(lastTimeList));
    return;
},
registerUri : function(uri, interval, title, dayOfTheWeek, hour){
    var lastTime = this.unregisterUri(uri);
    
    if(!this.uriList[interval]) this.uriList[interval] = {};

    this.uriList[interval][uri] = {};
    this.uriList[interval][uri]["title"] = title;
    if(dayOfTheWeek>-1) this.uriList[interval][uri]["dayOfTheWeek"] = dayOfTheWeek;
    if(hour){
      var array = hour.split(":");
      if(array.length!=2) hour = null
      else{
        hour = ("0" + array[0]).slice(-2)+":"+("0" + array[1]).slice(-2);
        this.uriList[interval][uri]["hour"] = hour;        
      }
    }
    if(lastTime) this.uriList[interval][uri]["lastTime"] = lastTime;   
    
    this.setLastTime(uri, interval);
    this.setUriList();
    
    var menuList = this.getMenuList();
    if(!menuList[interval]){
        menuList[interval] = {};
        menuList[interval]["enabled"] = true;
        
        this.setMenuList(menuList);
    }
    
    return;
},
setLastTime : function(uri, interval){
    var dd = new Date();
    var now = dd.getTime();
    
    if(!this.uriList[interval][uri]["lastTime"]){
        this.uriList[interval][uri]["lastTime"] = now;
    }
    return    
},
unregisterUri : function(uri){
    var info = this.isRegistered(uri);
    if(!info) return;

    delete this.uriList[info["interval"]][uri];
    this.setUriList();

    return info["lastTime"];
},
isEmpty : function(object){
    for(var keys in object){
        if(keys) return false;
    }
    return true;
},
isBrowsedAtOneTime : function(interval){    
    if (pbCommon.Branch.getBoolPref("advanced.browseAtOneTime")) {
        if(interval.toString().charAt(interval.length-1)=="h"){
            interval = interval.substring(0,interval.length-1)/24;
        }
        var maxCycle = pbCommon.Branch.getIntPref("advanced.MaxCycleBrowsingAtOneTime");
        return (interval <= maxCycle);
    }
    else return false;
},
isRegistered : function(uri){
    if(!uri) return null;
    
    for(var interval in this.uriList){
        if(this.uriList[interval][uri]){
            return {"interval": interval,
             "dayOfTheWeek": this.uriList[interval][uri]["dayOfTheWeek"],
             "hour": this.uriList[interval][uri]["hour"],
             "lastTime" : this.uriList[interval][uri]["lastTime"]
             };
        }
    }
    return null;

    //  var re = new RegExp(","+uri+"[, ]");
//  return this.uriList.match(re);
},
getIntervalList : function(){
    var intervalList = new Array();
    
    for(var interval in this.uriList){
        intervalList.push(interval);
    }       
    intervalList.sort(this.compare);
    return intervalList;
},
compare : function(a, b){
    if(a.toString().charAt(a.length-1)=="h"){
        a = a.substring(0,a.length-1)/24;
    }
    if(b.toString().charAt(b.length-1)=="h"){
        b = b.substring(0,b.length-1)/24;
    }
    return (a - b); 
}
}

pbCommon.init();
