var pbOption={
canClose : true,
strbundle : document.getElementById("pb-pref-bundle"),
nowSearchProcessing : false,
itemList : null,
Init: function(){
  Components.utils.import("resource://periodicbrowsing/pbCommon.jsm");
	
  //alert(window.arguments[0]);
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
	var mainWindow = wm.getMostRecentWindow("navigator:browser");
	pbOption.br = mainWindow.getBrowser();

	var menuList = pbCommon.getMenuList();
	var editButton = document.getElementById("menuEdit.editButton");
	editButton.label = pbOption.strbundle.getString("edit");

	var uri = pbOption.br.currentURI.spec;

	var intervalMenu = document.getElementById("pref.general.interval");
	intervalMenu.addEventListener("click", pbOption.intervalMenuClicked, false);
		
	var intervalList = pbCommon.getIntervalList();
	var currentPageItem, cpIdx;
	var idx = 0;

	var interval;
  
	var dayMenubox = document.getElementById("pref.general.dayList");
  dayMenubox.selectedIndex = -1;
  dayMenubox.setAttribute("label", dayMenubox.getAttribute("default"))
	for(var i=0; i<7; i++){
		dayMenubox.appendItem(pbCommon.dayNameList[i]);
  }
    
	for(var i=0; i<intervalList.length; i++){
		interval = intervalList[i];

		if(menuList[interval]){
      if(menuList[interval]["enabled"]) intervalMenu.appendItem(intervalList[i]);
  		pbOption.addNewItemToMenuList(menuList[interval]["enabled"], interval, menuList[interval]["accesskey"]);
    }

		for(var uris in pbCommon.uriList[interval]){
			var title = pbCommon.uriList[interval][uris]["title"];
      var dayOfTheWeek = pbCommon.uriList[interval][uris]["dayOfTheWeek"];
      var hour = pbCommon.uriList[interval][uris]["hour"];
      
			var item = pbOption.addNewItemToList(uris, interval, title, dayOfTheWeek, hour);
			if(!currentPageItem && uris == uri){
				currentPageItem = item;
				cpIdx = idx;
			}
			idx++;
		}
	}
	if(cpIdx){
		var listbox = item.parentNode;
		listbox.ensureElementIsVisible(currentPageItem);
		listbox.selectedItem = currentPageItem;
	}
	else{	
		var title = pbOption.br.contentTitle;
		if(!title) title = pbOption.strbundle.getString("noTitle");
		var uriTextBox = document.getElementById("pref.general.url");
		uriTextBox.value = uri;
		var titleTextBox = document.getElementById("pref.general.title");
		titleTextBox.value = title;
	}

	var uriListBox = document.getElementById("pref.general.urilist");
	uriListBox.addEventListener("dblclick", function(){pbOption.browseNow('pref.general.urilist');}, true);
//	intervalMenu.inputField.emptyText="";

	pbOption.uriEdited();
		
	var seachPages = document.getElementById("seachPages");
	seachPages.focus();
	
	return;
},
intervalMenuClicked : function(){
	if(this.value==document.getElementById("listheader.interval").getAttribute("label")) this.value = "";
},
addUri : function(){
	var uriTextbox = document.getElementById("pref.general.url");
	var titleTextBox = document.getElementById("pref.general.title");
	var intervalTextbox = document.getElementById("pref.general.interval");
	var dayMenubox = document.getElementById("pref.general.dayList");
	var hourTextbox = document.getElementById("pref.general.hour");
	
	var uri = pbOption.trim(uriTextbox.value);
	var title = titleTextBox.value;
	var interval = pbOption.trim(intervalTextbox.value);
	if(dayMenubox.selectedIndex>-1) var day = dayMenubox.selectedIndex;
	var hour = pbOption.trim(hourTextbox.value);
  
	if(!uri || !interval || interval==0 || interval=="0h" || intervalTextbox.value==document.getElementById("listheader.interval").getAttribute("label")) return;
  
	pbCommon.registerUri(uri, interval, title, day, hour);
	
	var add = pbOption.strbundle.getString("add");
	var edit = pbOption.strbundle.getString("edit");

	var addButton = document.getElementById("pref.general.addUrl");
	if(addButton.label == add){
		var item = pbOption.addNewItemToList(uri, interval, title, day, hour);	
		item.parentNode.selectedItem = item;

		uriTextbox.value = "";
		titleTextBox.value = "";
		intervalTextbox.label = "";	
		dayMenubox.selectedIndex = -1;
    dayMenubox.setAttribute("label", dayMenubox.getAttribute("default"))
		hourTextbox.value = "";
	}
	else{
		pbOption.editItem(uri,interval, title, day, hour);
	}
	
	pbOption.uriEdited();
},
addNewItemToList : function(uri, interval, title, dayOfTheWeek, hour){
	var uriListBox = document.getElementById("pref.general.urilist");
	var listitem = document.createElement("listitem");
	
	var uriCell = document.createElement("listcell");
	uriCell.setAttribute("label", uri);
	listitem.appendChild(uriCell);

	var titleCell = document.createElement("listcell");
	titleCell.setAttribute("label", title);
	listitem.appendChild(titleCell);	

	var intervalCell = document.createElement("listcell");
	intervalCell.setAttribute("label",interval);
	listitem.appendChild(intervalCell);

	var dayCell = document.createElement("listcell");
	if(dayOfTheWeek>-1) dayCell.setAttribute("label", pbCommon.dayNameList[dayOfTheWeek]);
	listitem.appendChild(dayCell);

	var hourCell = document.createElement("listcell");
	if(hour) hourCell.setAttribute("label", hour);
	listitem.appendChild(hourCell);

  listitem.setAttribute("tooltiptext", title+"\n"+uri)	
	uriListBox.appendChild(listitem);
	
	return listitem;
},
addNewItemToMenuList : function(enabled, interval, accesskey){
	var menuListBox = document.getElementById("pref.menuEdit.menulist");
	var listitem = document.createElement("listitem");
	listitem.addEventListener("click", this.toggleCheck, false);
	
	var enabledCell = document.createElement("listcell");
	enabledCell.setAttribute("type", "checkbox");
	enabledCell.setAttribute("checked", enabled);
	listitem.appendChild(enabledCell);

	var intervalCell = document.createElement("listcell");
	intervalCell.setAttribute("label", interval);
	listitem.appendChild(intervalCell);
	
	var acckeyCell = document.createElement("listcell");
	if(accesskey) acckeyCell.setAttribute("label", accesskey);
	listitem.appendChild(acckeyCell);

	menuListBox.appendChild(listitem);

	return;
},
toggleCheck : function(aEvent){
	var item = aEvent.target;
	var enabledCell = item.childNodes[0];
	//文字列で返されるため
	var enabled = enabledCell.getAttribute("checked")!="true";
	enabledCell.setAttribute("checked", enabled)
	
	var menuList = pbCommon.getMenuList();
	var interval = item.childNodes[1].getAttribute("label");
	menuList[interval]["enabled"] = enabled;
	
	pbCommon.setMenuList(menuList);

	return
},
menuListEdit : function(){
	var lb = document.getElementById("pref.menuEdit.menulist");
	var idx = lb.currentIndex;
	if(idx==-1) return;

	var selectedItem = lb.selectedItem;
	var acckeyCell = selectedItem.childNodes[2];
	var preAcckey = acckeyCell.getAttribute("label")
	var acckey = prompt(document.getElementById("listheader.accesskey").getAttribute("label"), preAcckey);
	if(preAcckey == acckey) return;
	
	acckeyCell.setAttribute("label", acckey);
	var interval = selectedItem.childNodes[1].getAttribute("label");
	var menuList = pbCommon.getMenuList();
	menuList[interval]["accesskey"] = acckey;
	
	pbCommon.setMenuList(menuList);
	
	return
},
editItem : function(uri, interval, title, dayOfTheWeek, hour){
	var uriListBox = document.getElementById("pref.general.urilist");
	for(var i=0; i<uriListBox.childNodes.length; i++){
		var listitem = uriListBox.childNodes[i];
		var uriCell = listitem.childNodes[0];
		if(uriCell.getAttribute("label")==uri){
			var titleCell = listitem.childNodes[1];			
			var intervalCell = listitem.childNodes[2];
			var dayCell = listitem.childNodes[3];
			var hourCell = listitem.childNodes[4];

			titleCell.setAttribute("label", title);
			intervalCell.setAttribute("label", interval);
      if(dayOfTheWeek>-1) dayCell.setAttribute("label", pbCommon.dayNameList[dayOfTheWeek]);
      if(hour) hourCell.setAttribute("label", hour);
      
			break;
		}
	}
	return;	
},
listDelete : function(list){
	var lb = document.getElementById(list);
	var deletedItem = lb.selectedItem;

	var idx = lb.currentIndex;
	if(idx==-1) return;
	
	var uri = deletedItem.childNodes[0].getAttribute("label");
	pbCommon.unregisterUri(uri);
	
	lb.removeItemAt(idx);
	if(idx==lb.itemCount) idx-=1;
	setTimeout(function(){lb.selectedIndex = idx},50);

	var uriTextbox = document.getElementById("pref.general.url");
	var titleTextBox = document.getElementById("pref.general.title");
	var intervalTextbox = document.getElementById("pref.general.interval");
	var dayMenubox = document.getElementById("pref.general.dayList");
	var hourTextbox = document.getElementById("pref.general.hour");

	uriTextbox.value = "";
	titleTextBox.value = "";
	intervalTextbox.label = "";
	dayMenubox.selectedIndex = -1;
  dayMenubox.setAttribute("label", dayMenubox.getAttribute("default"))
	hourTextbox.value = "";
	
	pbOption.toggleAddButton("add");
},
getTitle　: function(list){
	var lb = document.getElementById(list);
	var selectedItem = lb.selectedItem;
	if(!selectedItem) return;
		
	var titleTextBox = document.getElementById("pref.general.title");

	var uriCell = selectedItem.childNodes[0];
	var titleCell = selectedItem.childNodes[1];			
	var intervalCell = selectedItem.childNodes[2];			
	
	var uri = uriCell.getAttribute("label");
	var interval = intervalCell.getAttribute("label");

	pbOption.getTitleFromUri(uri, interval, titleCell, titleTextBox);
},
getAllTitles　: function(list){
	var lb = document.getElementById(list);

	for(var i=2; i<lb.childNodes.length; i++){
		var item = lb.childNodes[i];
		
		var uriCell = item.childNodes[0];
		var titleCell = item.childNodes[1];			
		var intervalCell = item.childNodes[2];
	
		var uri = uriCell.getAttribute("label");
		var interval = intervalCell.getAttribute("label");
	
		pbOption.getTitleFromUri(uri, interval, titleCell, null);
	}
},
getTitleFromUri : function(uri, interval, titleCell, titleTextBox){
	var title;

	var req = new XMLHttpRequest();
	req.open('GET', uri, true);
	req.overrideMimeType('text/xml');
	req.onreadystatechange = function (aEvt) {
  	if (req.readyState == 4) {
  		if(req.status == 200){
  			var html = req.responseText.replace(/\n/g," "); 
  			if(html.match(/<title[^>]*>([^<]*)<\/title>/i)){
  				title = RegExp.lastParen;
  			
    			title = pbOption.trim(title);
    			if(!title) title = pbOption.strbundle.getString("noTitle");
    
    			titleCell.setAttribute("label", title);
    
    			pbCommon.uriList[interval][uri]["title"] = title;
    			if(titleTextBox) titleTextBox.value = title;
    			pbCommon.setUriList();
  		  }
  	  }
  	}
  }
	req.send(null); 	
},
browseNow : function(list){
	var lb = document.getElementById(list);
	var selectedItem = lb.selectedItem;
	if(!selectedItem) return;

	var uriCell = selectedItem.childNodes[0];
	var uri = uriCell.getAttribute("label");
	
	pbOption.br.selectedTab = pbOption.br.addTab(uri);
},
trim : function(term){
	return term.replace(/^[ ]+|[ ]+$/g, '');
},
uriListSelected : function(){
	var listbox = document.getElementById("pref.general.urilist");
	var selectedItem = listbox.selectedItem;
	var uri = selectedItem.childNodes[0].getAttribute("label");
	var title = selectedItem.childNodes[1].getAttribute("label");
	var interval = selectedItem.childNodes[2].getAttribute("label");
	var hour = selectedItem.childNodes[4].getAttribute("label");
	
	document.getElementById("pref.general.url").value = uri;
	document.getElementById("pref.general.title").value = title;
	document.getElementById("pref.general.interval").value = interval;
  var dayMenubox = document.getElementById("pref.general.dayList");
  if (pbCommon.uriList[interval][uri]["dayOfTheWeek"] > -1) dayMenubox.selectedIndex = pbCommon.uriList[interval][uri]["dayOfTheWeek"];
  else {
    dayMenubox.selectedIndex = -1;
    dayMenubox.setAttribute("label", dayMenubox.getAttribute("default"))
  }
  dayMenubox.disabled = (interval!=7)
  var hourTextbox = document.getElementById("pref.general.hour");
  hourTextbox.disabled = (interval.slice(-1)=='h')
	if(hour) hourTextbox.value = hour;
	
	pbOption.toggleAddButton("edit");
	
	document.getElementById("browseNow").setAttribute("disabled", false);
	document.getElementById("getTitle").setAttribute("disabled", false);
},
intervalIsChangted : function(event){
  var interval = event.target.getAttribute("label");
  
  var dayMenubox = document.getElementById("pref.general.dayList");
  dayMenubox.disabled = (interval!=7)
  
  var hourTextbox = document.getElementById("pref.general.hour");
  hourTextbox.disabled = (interval.slice(-1)=='h')
},
uriEdited : function(){
	var uri = pbOption.trim(document.getElementById("pref.general.url").value);
	
	if(pbCommon.isRegistered(uri)) var word = "edit";
	else var word = "add";

	pbOption.toggleAddButton(word);	
},
/*
itemExceptURIIsEdited : function(){
	pbOption.toggleAddButton("edit");
},
*/
toggleAddButton : function(word){
	var addButton = document.getElementById("pref.general.addUrl");
	word = pbOption.strbundle.getString(word);
	addButton.label = word;	
},
searchPages : function(){
	if(pbOption.nowSearchProcessing){
		clearTimeout(pbOption.searchTimeoutID);
		delete pbOption.searchTimeoutID;	
		pbOption.searchTimeoutID = setTimeout(pbOption.searchPages, 100);
	}

	pbOption.nowSearchProcessing = true;
	
	var searchbox = document.getElementById("seachPages");
	var word = pbOption.trim(searchbox.value).toUpperCase();
	var list = document.getElementById("pref.general.urilist");
	var items = list.getElementsByTagName("listitem");

	if(pbOption.itemList){
		for(var i=0; i<pbOption.itemList.length; i++){
			if(pbOption.itemList[i]){
				if(items[i]) list.insertBefore(pbOption.itemList[i], items[i]);
				else list.appendChild(pbOption.itemList[i]);
			}
		}
	}

	var noMatchList = new Array();
	pbOption.itemList = new Array(items.length);
	if(word){
		var cells, j, hitted;
		for(var i=0; i<items.length; i++){
			cells = items[i].getElementsByTagName("listcell");
			hitted = false;
			for(j=0; j<cells.length; j++){
				if(cells[j].getAttribute("label").toUpperCase().indexOf(word.toString())>-1){
					hitted = true;
					break;
				}
			}
			if(!hitted)	noMatchList.push(i); 
		}
		for(var i=0; i<noMatchList.length; i++){
			pbOption.itemList[noMatchList[i]] = list.removeChild(items[noMatchList[i]-i/* remove したことにより減った分だけインデックスも減らす */]);
		}
	}
	else pbOption.itemList = null;

	pbOption.nowSearchProcessing = false;
	
	/*
	if(word){
		var cells, j, hitted;
		for(var i=0; i<items.length; i++){
			cells = items[i].getElementsByTagName("listcell");
			hitted = false;
			for(j=0; j<cells.length; j++){
				if(cells[j].getAttribute("label").toUpperCase().indexOf(word)>-1){
					hitted = true;
					break;
				}
			}
			items[i].collapsed = !hitted; 
		}
	}
	else{
		for(var i=0; i<items.length; i++){
			items[i].collapsed = false; 
		}
	}
	*/
},
onKeyPress : function(event){
	if(event.keyCode != event['DOM_VK_RETURN']) return;
	pbOption.canClose = false;
	pbOption.addUri();

	var uriListBox = document.getElementById("pref.general.urilist");
	uriListBox.focus();
	setTimeout(function(){pbOption.canClose=true},100);
},
onDialogAccept : function(){
	return pbOption.canClose;
}
}
