var periodicbrowsing_urlBarListener = {
  QueryInterface: function(aIID)
  {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },
  onLocationChange: function(aProgress, aRequest, aURI){
  	if(!aURI){
  		periodicbrowsing.toggleStatusBarPanel("");
  		return;
  	}
	var uri = aURI.spec;
	var info = pbCommon.isRegistered(uri);

	periodicbrowsing.toggleStatusBarPanel(info);
  },
  onStateChange: function() {},
  onProgressChange: function() {},
  onStatusChange: function() {},
  onSecurityChange: function() {},
  onLinkIconAvailable: function() {}	
}
/*
 * for debug
var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);

var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
file.append("pbDEBUG.txt");
// ファイル追記の際は、0x02 | 0x10 を使う
foStream.init(file, 0x02 | 0x10, 0664, 0); // write, create, truncate
 */

var periodicbrowsing = {
tabList : null,
loadedList : null,
visitedList : null,
closedList : null,
browsingList : null,
loadedTabNum : 0,
i : 0,
online : false,
loadingTabNumAtOneTime : 1,
loadingTimeoutID : null,
allReloadID : null,
checkInterval : 600*1000,
thisWindowIsMain : false,
/*
debug : function(data){
  data=data.toString()+"\n"
  foStream.write(data, data.length);
},
*/
init: function(){                  
    Components.utils.import("resource://periodicbrowsing/pbCommon.jsm");
//periodicbrowsing.keySet();	//shortcutkey set
    var contextMenu = document.getElementById("contentAreaContextMenu");
    contextMenu.addEventListener("popupshowing", periodicbrowsing, false);
    gBrowser.addProgressListener(periodicbrowsing_urlBarListener,
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    
    pbCommon.Branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    pbCommon.Branch.addObserver("", this, false);       
	  periodicbrowsing.applyStatusbarButtonSetting();
    
    Components.utils.import("resource://gre/modules/PluralForm.jsm");
    
  if(!pbCommon.dayNameList){
  	var bundle = document.getElementById("periodicbrowsing-bundle");
  	pbCommon.dayNameList = new Array();
    pbCommon.dayNameList.push(bundle.getString("Sunday"));
    pbCommon.dayNameList.push(bundle.getString("Monday"));
    pbCommon.dayNameList.push(bundle.getString("Tuesday"));
    pbCommon.dayNameList.push(bundle.getString("Wednesday"));
    pbCommon.dayNameList.push(bundle.getString("Thursday"));
    pbCommon.dayNameList.push(bundle.getString("Friday"));
    pbCommon.dayNameList.push(bundle.getString("Saturday"));
  }

  if(!pbCommon.Branch.getCharPref("menuList")) periodicbrowsing.initMenuList();
	var preVersion = pbCommon.Branch.getCharPref("version");
	if(pbCommon.Branch.getBoolPref("firstrun")){
		pbCommon.Branch.setBoolPref("firstrun",false);		
		pbCommon.Branch.setCharPref("version","0.8.0.0");
    /*
		window.setTimeout(function(){
			var strbundle = document.getElementById("periodicbrowsing-bundle");
			var msg=strbundle.getString("howToUse");
			alert(msg);
		},1250);
	*/
	}
	else if(preVersion<"0.8.0.0"){
		if(!preVersion){
			var uriList = pbCommon.Branch.getCharPref("uriList");
			//バックアップ
			pbCommon.Branch.setCharPref("previousUriList", uriList);
			
			//デフォルト値を代入
			if(pbCommon.Branch.prefHasUserValue("uriList")){
				pbCommon.Branch.clearUserPref("uriList");
			}
			var newUriList = pbCommon.getUriList();
			
			uriList = uriList.split(" ");
			uriList.shift();
			
			var lastTimeList = pbCommon.Branch.getCharPref("lastTimeList");
			//バックアップ
			pbCommon.Branch.setCharPref("previousLastTimeList", lastTimeList);
			
			for(var i=0; i<uriList.length; i++){
				uriList[i] = uriList[i].split(",");
				uriList[i].pop();
				var interval = uriList[i].shift();
				newUriList[interval] = {};
				for(var j=0; j<uriList[i].length; j++){
					var uri = uriList[i][j];
					newUriList[interval][uri] = {};
					newUriList[interval][uri]["title"] = "";
					var tmp1 = lastTimeList.indexOf(" "+uri+",");
					if(tmp1>-1){
						tmp1 += uri.length+2;
						var tmp2 = lastTimeList.indexOf(" ",tmp1);
						var lastTime = lastTimeList.substring(tmp1,tmp2);
						newUriList[interval][uri]["lastTime"] = lastTime;
					}
				}
			}
			
			var newUriListString = JSON.stringify(newUriList);
		
			pbCommon.Branch.setCharPref("uriList", newUriListString);
      pbCommon.init();
			
			var newLastTimeList = {}
			lastTimeList = lastTimeList.split(" ");
			for(var i=1; i<lastTimeList.length; i++){
				lastTimeList[i] = lastTimeList[i].split(",");
				if(lastTimeList[i][0].match(/^\d+h?$/))	newLastTimeList[lastTimeList[i][0]] = lastTimeList[i][1];
			}
			var newLastTimeListString = JSON.stringify(newLastTimeList);
			
			pbCommon.Branch.setCharPref("lastTimeList", newLastTimeListString);
		}
		if(preVersion<="0.4.0.0"){
			periodicbrowsing.initMenuList();
		}
    if (preVersion <= "0.7.0.0") {
      var lastTimeList = pbCommon.getLastTimeList();
    	var dd = new Date();
    	var now = dd.getTime();

      for (var interval in pbCommon.uriList) {
        if (pbCommon.isEmpty(pbCommon.uriList[interval])) continue;
        
        if (interval <= 1) {
          var lastTime = lastTimeList[interval];
          if (!lastTime) continue;
          
          for (var uris in pbCommon.uriList[interval]) {
    				pbCommon.uriList[interval][uris]["lastTime"] = now;
          }
        }
        else if(interval==7){
          var lastTime, elapsedDays, dayOfTheWeek;
        	var todayMidnight = now-(((dd.getHours()*60)+dd.getMinutes())*60+dd.getSeconds())*1000;
          for (var uris in pbCommon.uriList[interval]) {
            if(pbCommon.Branch.getBoolPref("advanced.browseInAStatedDay")){
              pbCommon.uriList[interval][uris]["lastTime"] = lastTimeList[interval];
              pbCommon.uriList[interval][uris]["dayOfTheWeek"] = pbCommon.Branch.getIntPref("advanced.browsingDayOfTheWeek")
            }
            else{
              lastTime = pbCommon.uriList[interval][uris]["lastTime"];
              if(!lastTime){
                lastTime = lastTimeList[interval];
                if(!lastTime) continue
              }
        			elapsedDays = Math.ceil((todayMidnight-lastTime)/86400000);
              dayOfTheWeek = (dd.getDay()-elapsedDays+7)%7
              pbCommon.uriList[interval][uris]["dayOfTheWeek"] = dayOfTheWeek;
            }
          }
        }
      }
      pbCommon.setUriList();
    }
		pbCommon.Branch.setCharPref("version","0.8.0.0");
	}
	periodicbrowsing.createMenu();
	periodicbrowsing.allTabsAreBrowsed = false;
  window.addEventListener("TreeStyleTabFocusNextTab",
    function(aEvent) {
      if (periodicbrowsing.getTabNumber(gBrowser.selectedTab)>-1)
        aEvent.preventDefault();
    }, false);

    setInterval(periodicbrowsing.periodicBrowse, periodicbrowsing.checkInterval);
//    Application.console.log("nnn")

    if(!pbCommon.alreadyWindowExisting && !pbCommon.sessionIsRestored){
       let intervalID = setTimeout(function(){
            ObserverService.removeObserver(observer, 'sessionstore-windows-restored', false);
            setTimeout(function(){
              pbCommon.sessionIsRestored = true;
            }, 100);
            pbCommon.getMaxTabNum();
          }, 30000);
       var branch = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService).getBranch("");
        if(branch.getIntPref("browser.startup.page")==3){
          var ObserverService = Cc['@mozilla.org/observer-service;1']
                                .getService(Ci.nsIObserverService);
          var observer = {
            observe: function(aSubject, aTopic, aData){
              if (aTopic == 'sessionstore-windows-restored'){
                clearInterval(intervalID);
                   ObserverService.removeObserver(observer, 'sessionstore-windows-restored', false);
                    setTimeout(function(){
                      pbCommon.sessionIsRestored = true;
                      pbCommon.getMaxTabNum();        
                      periodicbrowsing.checkThisWindowIsMain(0);
                    }, 100);
              } 
            }
          }
          //On Firefox 4, this may not work
          ObserverService.addObserver(observer, 'sessionstore-windows-restored', false);

        }
        else{
          pbCommon.alreadyWindowExisting = true;
          periodicbrowsing.thisWindowIsMain = true;
	        setTimeout(function(){
          	periodicbrowsing.waitBooting(0);
	        }, 500);
        }
    }
},
initMenuList : function(){
	var menuList = {};
	var bundle = document.getElementById("periodicbrowsing-bundle");
	for(var interval in pbCommon.uriList){
		menuList[interval] = {};
		menuList[interval]["enabled"] = true;
		if(interval=="1h"){
			menuList[interval]["accesskey"] = bundle.getString("registerEveryHourAccesskey");
 		}
 		else if(interval==365){
			menuList[interval]["accesskey"] = bundle.getString("registerEveryYearAccesskey");
  		}
 		else if(interval==180){
			menuList[interval]["accesskey"] = bundle.getString("registerEveryHalfYearAccesskey");
 		}
 		else if(interval==30){
			menuList[interval]["accesskey"] = bundle.getString("registerEveryMonthAccesskey");
 		}
 		else if(interval==7){
			menuList[interval]["accesskey"] = bundle.getString("registerEveryWeekAccesskey");
 		}
		else if(interval==1){
			menuList[interval]["accesskey"] = bundle.getString("registerEveryDayAccesskey");
		}
	}
	pbCommon.setMenuList(menuList);

	return
},
createMenu : function(){
	var menuList = pbCommon.getMenuList();
	var intervalList = pbCommon.getIntervalList();
	
	var menuNameList = new Array("toolmenu", "contextmenu", "statusbar-panel");
	for(var j=0; j<menuNameList.length; j++){
		var menuName = menuNameList[j];
	
		var menu = document.getElementById("pb-"+menuName+"-popup");
		var unregisterMenu = document.getElementById("pb-"+menuName+"-unregister");
		var unregisterSeparator = document.getElementById("pb-"+menuName+"-unregister-separator");
		var configSeparator = document.getElementById("pb-"+menuName+"-config-separator");
		var config = menu.lastChild;
			
		// Remove all children of the menu:
		while (unregisterSeparator.nextSibling != configSeparator) {
			menu.removeChild(unregisterSeparator.nextSibling);
		}
		var panel = document.getElementById("brprPanel");
	
		var bundle = document.getElementById("periodicbrowsing-bundle");
		
		var PluralFormGet, numForms;
		[PluralFormGet, numForms] = PluralForm.makeGetter(bundle.getString("pluralRule"));
		
		for (var i = 0; i < intervalList.length; i++) {
			var interval = intervalList[i];
			if(!menuList[interval] || !menuList[interval]["enabled"]) continue;
			var menuitem = document.createElement("menuitem");
			menuitem.id = "pb-"+menuName+"-every-" + interval;
			menuitem.setAttribute("oncommand", 'periodicbrowsing.register("'+interval+'");');
			if(menuList[interval]["accesskey"]) menuitem.setAttribute("accesskey", menuList[interval]["accesskey"]);
	
			if(interval.toString().charAt(interval.length-1)=="h"){
				interval = interval.substring(0, interval.length-1);
	  			var label = PluralFormGet(interval, bundle.getString("browseEveryNHours"));
	  			//var label = bundle.getString("browseEveryNHours");
	  			
	  			label = label.replace("#1", interval);
	 		}
	 		else if(interval%365==0){
	 			interval /= 365;
				var label = PluralFormGet(interval, bundle.getString("browseEveryNYears"));
	  			//var label = bundle.getString("browseEveryNYears");
	  			
	  			label = label.replace("#1", interval);
	 		}
	 		else if(interval==180){
				var label = bundle.getString("browseEveryHalfYear"); 
	 		}
	 		else if(interval%30==0){
	 			interval /= 30;
				var label = PluralFormGet(interval, bundle.getString("browseEveryNMonths"));
	  			//var label = bundle.getString("browseEveryNMonths");
				//var label = PluralForm.get(interval, bundle.getString("browseEveryNMonths")); 
	  			label = label.replace("#1", interval);
	 		}
	 		else if(interval%7==0){
	 			interval /= 7;	
	  			var label = PluralFormGet(interval, bundle.getString("browseEveryNWeeks"));
	 			label = label.replace("#1", interval); 			
	 		}
			else{
				var label = PluralFormGet(interval, bundle.getString("browseEveryNDays"));
	  			//var label = bundle.getString("browseEveryNDays");
				//var label = PluralForm.get(interval, bundle.getString("browseEveryNDays")); 
	 			label = label.replace("#1", interval); 
			}
			menuitem.setAttribute("label", label);
			menu.insertBefore(menuitem, configSeparator);
		}
	}
	return;
},
uninit: function(){
    var contextMenu = document.getElementById("contentAreaContextMenu");
    contextMenu.removeEventListener("popupshowing", periodicbrowsing, false);
    gBrowser.removeProgressListener(periodicbrowsing_urlBarListener);

    if(periodicbrowsing.thisWindowIsMain){
        pbCommon.alreadyWindowExisting = false;
    }
},
observe: function(aSubject, aTopic, aData){
    if(aTopic != "nsPref:changed") return;
    // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
    // aData is the name of the pref that's been changed (relative to aSubject)
    switch (aData) {
      case "advanced.hideStatusbarButton":
        periodicbrowsing.applyStatusbarButtonSetting();
        break;
      case "menuList":
      	periodicbrowsing.createMenu();
        break;
    }
},
applyStatusbarButtonSetting : function(){
	var panel = document.getElementById("brprPanel");
	panel.setAttribute("hidden", pbCommon.Branch.getBoolPref("advanced.hideStatusbarButton"))
},
handleEvent: function(event) {
	if (event.type == "popupshowing") {
		//var clickedWhereAnythingIs = ;
		document.getElementById("pb-contextmenu").hidden = pbCommon.Branch.getBoolPref("advanced.disableContextMenu") || 
															(gContextMenu.isTextSelected || gContextMenu.onLink ||
																gContextMenu.onImage || gContextMenu.onTextInput);
		/*
	if(clickedWhereAnythingIs){
		if(registerMenu) registerMenu.hidden = true;
		if(unregisterMenu) unregisterMenu.hidden = true;
		return;
	}
	*/

	}
},
panelPressed : function(event){
	var panel = document.getElementById("brprPanel");
    switch (event.button){
      //left click
      case 0  : var preInterval = panel.label;
  				if(preInterval){
      				periodicbrowsing.unregister();
      			}
      			else{
      				var menu = document.getElementById("pb-statusbar-panel-popup");
      				menu.openPopup( panel , "before_start" , 0 , 0 , true, false );
      			}
                break;
      //middle click
      case 1  : var preInterval = panel.label;
 				var quickInterval = pbCommon.Branch.getIntPref("advanced.intervalOfQuickRegister");
  				if(preInterval==quickInterval){
      				periodicbrowsing.unregister();
      			}
      			else{
      				periodicbrowsing.register(quickInterval);
      			}
                break;
      //right click
      case 2  : var menu = document.getElementById("pb-statusbar-panel-popup");
      			menu.openPopup( panel , "before_start" , 0 , 0 , true, false );
      			//window.openDialog("chrome://periodicbrowsing/content/pbOption.xul", "Preferences", "chrome,titlebar,toolbar,centerscreen,modal","pref.general");
                break;
    }	
},
toggleStatusBarPanel : function(info){
	var panel = document.getElementById("brprPanel");

  if(info){
    var text = info["interval"];
    if(info["dayOfTheWeek"]>-1) text += " "+pbCommon.dayNameList[info["dayOfTheWeek"]];
    if(info["hour"]) text += " "+info["hour"]; 
  	panel.label = text;
		panel.image = "chrome://periodicbrowsing/skin/icon16x16.png";
  }
  else{
    panel.label = "";
  	panel.image = "chrome://periodicbrowsing/skin/disabledIcon16x16.png";		
	} 
	
	var menuNameList = new Array("toolmenu", "contextmenu", "statusbar-panel");
	for(var j=0; j<menuNameList.length; j++){
		var menuName = menuNameList[j];
	
		var unregisterMenu = document.getElementById("pb-"+menuName+"-unregister");
		var unregisterSeparator = document.getElementById("pb-"+menuName+"-unregister-separator");
		if(info){
			if(unregisterMenu) unregisterMenu.hidden = false;
			if(unregisterSeparator) unregisterSeparator.hidden = false;
		}
		else{
			if(unregisterMenu) unregisterMenu.hidden = true;
			if(unregisterSeparator) unregisterSeparator.hidden = true;
		}
		
		var premenuitem = document.getElementById("pb-"+menuName+"-every-" + periodicbrowsing.preInterval);
		if(premenuitem){
			premenuitem.setAttribute("checked", "false");
		}
    if(info){
  		var menuitem = document.getElementById("pb-"+menuName+"-every-" + info["interval"]);
  		if(menuitem){
  			menuitem.setAttribute("type", "checkbox");
  			menuitem.setAttribute("checked", "true");
  		}      
    }
	}
  periodicbrowsing.preInterval = info ? info["interval"] : "";	
},
periodicBrowse : function() {
    if(!periodicbrowsing.thisWindowIsMain){
	    if(!pbCommon.alreadyWindowExisting){          
        pbCommon.getMaxTabNum();
        
        var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
              .getService(Components.interfaces.nsISessionStore);
        var winState = JSON.parse(ss.getWindowState(window));
        var tabNum = winState["windows"][0]["tabs"].length-0
        
        if (tabNum >= pbCommon.maxTabNum) {
          pbCommon.alreadyWindowExisting = true;
          periodicbrowsing.thisWindowIsMain = true;
        }
        else return
	    }
      else return
    }

    var lastCheckTime = pbCommon.Branch.getCharPref("lastCheckTime");

	var dd = new Date();
	var now = dd.getTime();
	var todayMidnight = now-(((dd.getHours()*60)+dd.getMinutes())*60+dd.getSeconds())*1000;
				
	//もし、十分ごとにチェックしてるはずなのに前回のチェック時間が20分以上前なら（Firefox の終了や休止状態が途中であったなら）、起動直後と判断
	var nowBooted = (now-lastCheckTime > 1200000);
	
  //前回表示できなかった分（あれば）を取得
  var cache = pbCommon.Branch.getCharPref("cache");
  var browsingList = JSON.parse(cache);
    
	for(var interval in pbCommon.uriList){
		if(pbCommon.isEmpty(pbCommon.uriList[interval])) continue;
	
		for(var uris in pbCommon.uriList[interval]){
    	var lastTime = pbCommon.uriList[interval][uris]["lastTime"];
    	if(!lastTime)	pbCommon.setLastTime(uris, interval)
      
			if(periodicbrowsing.checkTime(interval,  pbCommon.uriList[interval][uris], now, todayMidnight, nowBooted)){
				pbCommon.uriList[interval][uris]["lastTime"] = now;
        if(cache.indexOf('"'+uris+'"')==-1) browsingList.push(uris);
			}
		}
	}
	pbCommon.Branch.setCharPref("lastCheckTime", now);
	
	if(!browsingList.length) return;

  periodicbrowsing.saveCache(browsingList);
	
	periodicbrowsing.online = true;
	periodicbrowsing.tabList = new Array(browsingList.length);
	periodicbrowsing.visitedList = new Array(browsingList.length);
	periodicbrowsing.loadedList = new Array(browsingList.length);
	periodicbrowsing.closedList = new Array(browsingList.length);
  periodicbrowsing.isSameDomainList = new Array(browsingList.length);
	periodicbrowsing.loadedTabNum=0;
	
	for(var i=0; i<browsingList.length; i++){
		periodicbrowsing.visitedList[i] = false;
		periodicbrowsing.loadedList[i] = false;
		periodicbrowsing.closedList[i] = false;
  }
    
	
	gBrowser.tabContainer.addEventListener("TabSelect", periodicbrowsing.tabSelected, false);
	gBrowser.tabContainer.addEventListener("TabClose", periodicbrowsing.tabRemoved, false);

	periodicbrowsing.i=0;
	periodicbrowsing.browsingList=browsingList;

  //設定保存
  pbCommon.setUriList();
    
	periodicbrowsing.initBrowsePages(nowBooted);
},
checkTime : function(interval, info, now, todayMidnight, nowBooted){	
  var lastTime = info["lastTime"];
	var timeToBrowse = false;
	if(interval.toString().charAt(interval.length-1)=="h"){
		interval = interval.substring(0,interval.length-1);
		if(now - lastTime > interval * 3600000) timeToBrowse = true;
	}
	else{
    var hour = info["hour"];
		var dd = new Date();
    if(hour){
  		var elapsedDays = Math.ceil((todayMidnight-lastTime)/86400000);
      var presentTime = ("0" + dd.getHours()).slice(-2)+":"+("0" + dd.getMinutes()).slice(-2);
  		if(nowBooted){
    		if(interval==7){
          var dayOfTheWeek = info["dayOfTheWeek"];
    			timeToBrowse = elapsedDays>7 || 
            ((elapsedDays==7 || (elapsedDays>0 && dd.getDay() == dayOfTheWeek)) && presentTime>=hour);
    		}
        else{
    			timeToBrowse = elapsedDays>interval || (elapsedDays==interval && presentTime>=hour);        
        }
  		}
  		else{
    		if(interval==7){
          var dayOfTheWeek = info["dayOfTheWeek"];
          if(dd.getDay() == dayOfTheWeek){
      			var elapsedDays = Math.ceil((todayMidnight-lastTime)/86400000);
            timeToBrowse = elapsedDays>0 && (presentTime>=hour)          
          }
    		}
        else{
          timeToBrowse = elapsedDays>interval || (elapsedDays==interval && presentTime>=hour);
        }
  		}
  	}
    else if(nowBooted){
  		var elapsedDays = Math.ceil((todayMidnight-lastTime)/86400000);
  		if(interval==7){
        var dayOfTheWeek = info["dayOfTheWeek"];
  			timeToBrowse = (elapsedDays>6 || (elapsedDays>0 && dd.getDay() == dayOfTheWeek));
  		}
      else{
  			timeToBrowse = (elapsedDays>=interval) || 
    			(interval==1 && (now-lastTime>64800000/* 24 * 3600 * 1000 * 3/4  */));        
      }
  	}
  	else{
  		if(interval==7){
        var dayOfTheWeek = info["dayOfTheWeek"];
        if(dd.getDay() == dayOfTheWeek){
    			var elapsedDays = Math.ceil((todayMidnight-lastTime)/86400000);
          timeToBrowse = (elapsedDays>0 && now-lastTime>elapsedDays * 86400000)          
        }
  		}
      else{
        timeToBrowse = (now-lastTime>interval * 86400000);
      }
  	}
  }
    	
	return timeToBrowse
},
initBrowsePages : function(nowBooted){
	var existingTab;
	var nowLoadingList = new Array();
	var notNowLoadingList = new Array();
	var nowLoadingTabNum=0;
	for(var i=0; i<periodicbrowsing.browsingList.length; i++){
		if(pbCommon.Branch.getBoolPref("advanced.reuseTabs") &&
			(existingTab = periodicbrowsing.getTab(periodicbrowsing.browsingList[i])) &&
            gBrowser.getBrowserForTab(existingTab).webProgress.isLoadingDocument){
				nowLoadingList.push(periodicbrowsing.browsingList[i]);
				periodicbrowsing.tabList[nowLoadingTabNum] = existingTab;
				var targetBrowser = gBrowser.getBrowserForTab(existingTab);
				nowLoadingTabNum++;
				targetBrowser.addEventListener("load", periodicbrowsing.loaded, true);
				
				targetBrowser.reload(Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);

				if(pbCommon.Branch.getBoolPref("advanced.closeByDoubleclick")) 
					targetBrowser.addEventListener("dblclick", periodicbrowsing.close, true);
		}
		else{
			notNowLoadingList.push(periodicbrowsing.browsingList[i]);
		}
	}	
	periodicbrowsing.i = nowLoadingTabNum;
	periodicbrowsing.browsingList = nowLoadingList.concat(notNowLoadingList);

    periodicbrowsing.saveCache(periodicbrowsing.browsingList.slice(nowLoadingTabNum));

    var domain;
    var domainList = " ";
    for(var i=0; i<periodicbrowsing.browsingList.length; i++){
        if(periodicbrowsing.browsingList[i].match(/^https?:\/\/([^\/]*)/)) domain = RegExp.$1;
        else{
            periodicbrowsing.isSameDomainList[i] = false;
            continue;
        }
        
        if(domainList.indexOf(" "+domain+" ")>-1) periodicbrowsing.isSameDomainList[i] = true;
        else{
            domainList += domain+" ";
            periodicbrowsing.isSameDomainList[i] = false;            
        }
    }
    
	clearTimeout(periodicbrowsing.loadingTimeoutID);
	delete periodicbrowsing.loadingTimeoutID;	
	periodicbrowsing.loadingTimeoutID = setTimeout(periodicbrowsing.setLoaded, 60000);
  
	if(periodicbrowsing.i<periodicbrowsing.browsingList.length){
		setTimeout(function(){periodicbrowsing.browsePages(nowBooted, 0)}, 950);
	}
},
browsePages : function(nowBooted, aCount){
 
	var i=periodicbrowsing.i;
//	var waitTime=pbCommon.Branch.getIntPref("advanced.tabInterval");
	/*
	if(periodicbrowsing.online && 
		i>=periodicbrowsing.loadedTabNum+periodicbrowsing.loadingTabNumAtOneTime){
		window.setTimeout(function(){periodicbrowsing.browsePages(nowBooted)}, waitTime);
		return;
	}
	*/
	
//	if(periodicbrowsing.tabList[i].parentNode){
	
	var numTabs = gBrowser.tabContainer.childNodes.length;
	var loadingTab = 0;
	
	for(var index=0; index<numTabs; index++) {
		var currentBrowser = gBrowser.tabContainer.childNodes[index].linkedBrowser;
		////まだロードが始まってない（URIが"about:blank"ならそう判断）かロード中のものをカウント
		//if(currentBrowser.currentURI.spec=="about:blank" || currentBrowser.webProgress.isLoadingDocument){
		if(currentBrowser.webProgress.isLoadingDocument){
			loadingTab++;
		}
    }

    //ロード中のページが2個未満、あるいは11回目のチェックなら
	if(loadingTab<2 || aCount > 10){
    //同じドメインのページがあるなら、20秒間隔を開けて開くようにする
    if(periodicbrowsing.isSameDomainList[i]){
        periodicbrowsing.isSameDomainList[i] = false;
      setTimeout(function(){periodicbrowsing.browsePages(nowBooted, aCount+1);}, 20000);
      return;            
    }
    
    var existingTab;
    if(pbCommon.Branch.getBoolPref("advanced.reuseTabs") &&
        (existingTab = periodicbrowsing.getTab(periodicbrowsing.browsingList[i]))){
            periodicbrowsing.tabList[i] = existingTab;
        }
    else{
		  periodicbrowsing.tabList[i]=gBrowser.addTab("about:blank", {relatedToCurrent: true});
//		  periodicbrowsing.moveTabTo(periodicbrowsing.tabList[i], )
    }
		var targetBrowser = gBrowser.getBrowserForTab(periodicbrowsing.tabList[i]);
		targetBrowser.addEventListener("load", periodicbrowsing.loaded, true);
	
    try{
      if(existingTab){
          targetBrowser.reload(Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
      }
      else targetBrowser.loadURIWithFlags(periodicbrowsing.browsingList[i], Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);	      
    }
    catch(e){
      Application.console.log(e)
    }
	
		if(pbCommon.Branch.getBoolPref("advanced.closeByDoubleclick")) 
			targetBrowser.addEventListener("dblclick", periodicbrowsing.close, true);	
	}
	else{
		setTimeout(function(){periodicbrowsing.browsePages(nowBooted, aCount+1);}, 1000);
		return;
	}

 	i++;
	periodicbrowsing.i = i;

  periodicbrowsing.saveCache(periodicbrowsing.browsingList.slice(i));

  if(i<periodicbrowsing.browsingList.length){
		setTimeout(function(){periodicbrowsing.browsePages(nowBooted, 0)}, 1000);
	}
	clearTimeout(periodicbrowsing.loadingTimeoutID);
	delete periodicbrowsing.loadingTimeoutID;	
	periodicbrowsing.loadingTimeoutID = setTimeout(periodicbrowsing.setLoaded, 60000);
},
checkThisWindowIsMain : function(aCount){
  if (pbCommon.maxTabNum) {
    var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
          .getService(Components.interfaces.nsISessionStore);
    var winState = JSON.parse(ss.getWindowState(window));
    var tabNum = winState["windows"][0]["tabs"].length-0
    if (tabNum >= pbCommon.maxTabNum) {
      if (gBrowser.selectedBrowser.currentURI.spec == "about:sessionrestore") {
        pbCommon.sessionIsRestored = false;
        return
      }
      
      pbCommon.alreadyWindowExisting = true;
      periodicbrowsing.thisWindowIsMain = true;
      
//      document.addEventListener("SSTabRestored", function(){
//        document.removeEventListener("SSTabRestored", arguments.callee, false);
        setTimeout(function(){
            periodicbrowsing.waitBooting(0);
        }, 100);
//      }, false);          
    }
  }
  else setTimeout(function(){
        periodicbrowsing.checkThisWindowIsMain();
      }, 10);
},
waitBooting : function(aCount){
   var restoringWindow =  Array.slice(gBrowser.tabContainer.childNodes)
     .filter(function(aTab) {
       var owner = aTab.linkedBrowser;
       var data = owner.parentNode.__SS_data;
       return data && data._tabStillLoading;
     }).length > 1;
  if(restoringWindow && aCount<30){
      setTimeout(function() {
        periodicbrowsing.waitBooting(aCount+1);
      }, 1000);
   }
   else periodicbrowsing.periodicBrowse();
},
getTab : function(url){
	var existingTab = null;

	// 必要としている URL を開いている browser が無いか確認する
	var numTabs = gBrowser.tabContainer.childNodes.length;
	for(var index=0; index<numTabs; index++) {
		var tab = gBrowser.tabContainer.childNodes[index];
		var currentBrowser = tab.linkedBrowser;
		
		if (url == currentBrowser.currentURI.spec) {
			existingTab = tab;
			break;
		}
  }
	return existingTab;
},
loaded : function(){
	periodicbrowsing.online = true;
	this.removeEventListener("load", periodicbrowsing.loaded, true);
	
	clearTimeout(periodicbrowsing.loadingTimeoutID);
	delete periodicbrowsing.loadingTimeoutID;

	for(var i=0; i<periodicbrowsing.tabList.length; i++){
		if(periodicbrowsing.closedList[i]) continue;
		var browser = gBrowser.getBrowserForTab(periodicbrowsing.tabList[i]);
		if(browser != this) continue;
		
		periodicbrowsing.loadedList[i] = true;
		break;
	}
	periodicbrowsing.loadedTabNum = periodicbrowsing.loadedTabNum + 1;
	//Application.console.log(periodicbrowsing.loadedTabNum +" "+ periodicbrowsing.i);
	//alert(periodicbrowsing.loadedTabNum +" " + periodicbrowsing.i);
	if(periodicbrowsing.loadedTabNum == periodicbrowsing.browsingList.length) periodicbrowsing.tabFocus();
	else periodicbrowsing.loadingTimeoutID = setTimeout(periodicbrowsing.setLoaded, 60000);
},
setLoaded : function(){
	clearTimeout(periodicbrowsing.loadingTimeoutID);
	delete periodicbrowsing.loadingTimeoutID;

	var errorList = new Array();
	var online = true;
	for(var i=0; i<periodicbrowsing.i; i++){
		if(periodicbrowsing.loadedList[i]) continue;

		var browser = gBrowser.getBrowserForTab(periodicbrowsing.tabList[i]);
		if(browser && browser.contentDocument){			
			var loadingError = false;
			var links = browser.contentDocument.getElementsByTagName("link");
			for(var j=0; j<links.length; j++){
				if(links[j].getAttribute("rel") != "stylesheet") continue;
				if(links[j].getAttribute("href")=="chrome://global/skin/netError.css"){
					loadingError = true;
					break;
				}
			}
			if(loadingError){
				browser.reload();
				errorList.push(i);
			}
			else{
				browser.removeEventListener("load", periodicbrowsing.loaded, true);
				periodicbrowsing.loadedList[i] = true;
				periodicbrowsing.loadedTabNum = periodicbrowsing.loadedTabNum + 1;
			}
			//ロードし終わってないページがすべて読み込みエラーの場合オフラインと見なす
			online = online && !loadingError;
		}
	}
	//オンラインでありながらページ読み込みエラーの場合、ロード済みであることにする
	if(online || errorList.length<2){
		for(var i=0; i<errorList.length; i++){
			periodicbrowsing.loadedList[errorList[i]] = true;
			periodicbrowsing.loadedTabNum = periodicbrowsing.loadedTabNum + 1;
		}
	}
	periodicbrowsing.online = online;
	if (periodicbrowsing.loadedTabNum == periodicbrowsing.browsingList.length)	periodicbrowsing.tabFocus();
	else if(periodicbrowsing.i==periodicbrowsing.browsingList.length) periodicbrowsing.allReloadID = setTimeout(periodicbrowsing.allReload, 600000);
},
allReload : function(){
	for(var i=0; i<periodicbrowsing.i; i++){
		if(periodicbrowsing.loadedList[i]) continue;

		var browser = gBrowser.getBrowserForTab(periodicbrowsing.tabList[i]);
		if(browser){			
			var loadingError = false;
			var links = browser.contentDocument.getElementsByTagName("link");
			for(var j=0; j<links.length; j++){
				if(links[j].getAttribute("rel") != "stylesheet") continue;
				if(links[j].getAttribute("href")=="chrome://global/skin/netError.css"){
					loadingError = true;
					break;
				}
			}
			if(loadingError){
				browser.reload();
			}
		}
	}
	periodicbrowsing.allReloadID = setTimeout(periodicbrowsing.allReload, 600000);
},
tabFocus : function(){
	window.clearTimeout(periodicbrowsing.loadingTimeoutID);
	delete periodicbrowsing.loadingTimeoutID;
	window.clearTimeout(periodicbrowsing.allReloadID);
	delete periodicbrowsing.allReloadID;
	
	if(pbCommon.Branch.getBoolPref("advanced.autoFocus")){
		var alreadySelected=false;//すでにユーザーによって選択されているか
		for(var i=periodicbrowsing.tabList.length-1; i>-1; i--){
			if(periodicbrowsing.closedList[i]) continue;
			if(gBrowser.selectedTab == periodicbrowsing.tabList[i]){
				alreadySelected=true;
				break;
			}
		}
		if(!alreadySelected){
			for(var i=periodicbrowsing.tabList.length-1; i>-1; i--){
				if(periodicbrowsing.closedList[i]) continue;
				//if(periodicbrowsing.loadedList[i]) continue;
				gBrowser.selectedTab = periodicbrowsing.tabList[i];
				break;
			}
		}
	}
},
tabSelected : function(aEvent){
	var tabNum = -1;
	for(var i=0; i<periodicbrowsing.tabList.length; i++){
		if(periodicbrowsing.tabList[i] == gBrowser.selectedTab){
			if(periodicbrowsing.visitedList[i]) return;
			tabNum = i;
			break;
		}
	}
	if(tabNum == -1) return;
	periodicbrowsing.visitedList[tabNum] = true;
},
getTabNumber : function(aTab){
	if(periodicbrowsing.allTabsAreBrowsed) return -1;
	
	var tabNum = -1;
	for(var i=0; i<periodicbrowsing.tabList.length; i++){
		if(periodicbrowsing.tabList[i] == aTab){
			tabNum = i;
			break;
		}
	}
	return tabNum;
},
tabRemoved : function(aEvent){
	var removedTab = aEvent.target;
	var tabNum = periodicbrowsing.getTabNumber(removedTab);
	if(tabNum == -1) return;
	
	periodicbrowsing.visitedList[tabNum] = true;
	periodicbrowsing.closedList[tabNum] = true;
	//ロードし終わってないのに閉じたら
	if(!periodicbrowsing.loadedList[tabNum]){
		periodicbrowsing.loadedTabNum=periodicbrowsing.loadedTabNum+1;
		periodicbrowsing.loadedList[tabNum]=true;
	}

	//他のタブに移動
	var i = tabNum - 1;
	if(i==-1) i=periodicbrowsing.visitedList.length-1;
	while(periodicbrowsing.visitedList[i] && i != tabNum){
		i--;
		if(i<0) i = periodicbrowsing.visitedList.length-1;
	}
	//全て表示済みの時
	if(i==tabNum){
		gBrowser.tabContainer.removeEventListener("TabSelect", periodicbrowsing.tabSelected, false);
		gBrowser.tabContainer.removeEventListener("TabClose", periodicbrowsing.tabRemoved, false);
		periodicbrowsing.allTabsAreBrowsed = true;
	}
	else{
		if(gBrowser.selectedTab==removedTab && pbCommon.Branch.getBoolPref("advanced.focusOnAnotherTabWhenYouClose")){
			gBrowser.selectedTab = periodicbrowsing.tabList[i];
		}
	}
},
close: function(){
	this.removeEventListener("dblclick", periodicbrowsing.close, true);
	gBrowser.removeCurrentTab();
},
register : function(interval){
	var uri = gBrowser.selectedBrowser.currentURI.spec;
	var title = gBrowser.selectedBrowser.contentTitle;
  if(interval==7){
    var dd = new Date();
    var dayOfTheWeek = dd.getDay();
  }

	pbCommon.registerUri(uri, interval, title, dayOfTheWeek, null);

	periodicbrowsing.toggleStatusBarPanel({
    "interval": interval,
    "dayOfTheWeek": dayOfTheWeek
  });
},
unregister : function(){
	var uri = gBrowser.currentURI.spec;
	pbCommon.unregisterUri(uri);
	
	periodicbrowsing.toggleStatusBarPanel("");
},
saveCache : function(browsingList){
    pbCommon.Branch.setCharPref("cache", JSON.stringify(browsingList));    
    return;
}
};

window.addEventListener("load", function() { periodicbrowsing.init(); }, false);
window.addEventListener("unload", function() {periodicbrowsing.uninit()}, false);
