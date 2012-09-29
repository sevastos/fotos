// PHOTOLIST


/**
 * In charge if organizing the list of Photos
 * @param string|element element The element the PhotoList will be rendered inside
 */
function PhotoList (element) {
  "use strict";

  /**
   * Count the photos available
   * @return integer The photos available
   */
  this.count = function () {
    return this.list.length;
  };

  /**
   * Add a Photo to the PhotoList
   * @param Photo The photo to add to the list
   * @return integer the index of the newly added photo
   */
  this.add = function (photo) {
    if ( !photo.file.type.match(/image.*/) ) {
      alert('Fotos accepts only images');
      return -1;
    }

    // Hide intro
    if (this.list.length === 0) {
      document.getElementById('intro').style.display = 'none';
    }

    this.list.push(photo);
    this.syncStorage();

    var i = this.list.length - 1;
    var itemEl = this.list[i].presentItem();
    itemEl.setAttribute('data-itemid', i);
    this.el.innerHTML = itemEl.outerHTML + this.el.innerHTML;
    this.setupItemEvents();

    return (this.list.length - 1);
  };

  /**
   * Getter for Photos based on index
   * @param  integer index The index number of the Photo on the list
   * @return Photo         The Photo object requested
   */
  this.get = function (index) {
    return this.list[index];
  };

  /**
   * Delete a photo from the list
   * @param  integer index he index of the Photo to delete
   */
  this.del = function (index) {
    if ( typeof this.list[index] != 'undefined '){
      this.list[index].del();
      this.list.splice(index, 1);

      var el = document.querySelector('[data-itemid="' + index + '"]');
      el.style.opacity = 0.7;
      el.className += ' removing';
      setTimeout(function(parent, el, plist) {
          parent.removeChild(el);
          if (plist.list.length === 0) {
            document.getElementById('intro').style.display = 'block';
          }
        }, 701, this.el, el, this
      );

      $('[data-itemid]').each(function(i, el){
        var ci = $(this).attr('data-itemid');
        if ( ci > index ) {
          $(this).attr('data-itemid', ci - 1);
        }
      });
      this.syncStorage();

    }
  };

  /**
   * Upload photo. See @Photo.upload()
   * @param  integer index The index of the Photo
   */
  this.upload = function (index) {
    if ( typeof this.list[index] != 'undefined' ) {
      this.list[index].upload();
    } else {
      console.log('Could not find and upload photo #' + index);
    }
  };

  /**
   * Loads gallery data from the cloud database
   * @param  integer webstorageId Optionally override localStorage.webstorageProxyId for the id
   */
  this.getOnlineDb = function (webstorageId) {
    // Offline
    if (!navigator.onLine) {
      return false;
    }

    var idToUse,
        localStorage = window.localStorage;
    if ( typeof webstorageId != 'undefined' ) {
      idToUse = webstorageId;
    } else if ( typeof localStorage.webstorageProxyId != 'undefined' ) {
      idToUse = localStorage.webstorageProxyId;
    } else {
      console.log('No Webstorage Id found locally');
      return false;
    }

    var thisPhotoList = this;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://smas.gr/proj/fotos/cloudstorage.php?id=" + idToUse);

    xhr.onload = function() {
      var res = JSON.parse(xhr.responseText);

      if ( res.response == 'success' ){
        try {
          $('#gallery-info').html('Gallery code: <strong>'+idToUse+'</strong>');
          localStorage.webstorageProxyId = idToUse;
          localStorage.setItem('photoList', res.data);
          thisPhotoList.init(thisPhotoList.el);
        } catch (e) {
          console.log('Unexpected error loading data from online db:');
          console.log(res);
        }
      } else {
        // failed to get something
        $('#gallery-info input').prop('disabled', '');
        if(typeof webstorageId != 'undefined') {
          alert('The code you typed looks like to be from the future, no photos there (yet)');
        }
      }
    };

    xhr.send();
  };

  /**
   * Update the cloud database with the local gallery data
   */
  this.syncOnlineDb = function () {
    // Offline
    if (!navigator.onLine) {
      return false;
    }

    var xhr = new XMLHttpRequest(),
        url = 'http://smas.gr/proj/fotos/cloudstorage.php',
        localStorage = window.localStorage;

    // Update, otherwise a key will be generated on the serverside
    if( typeof localStorage.webstorageProxyId != 'undefined' ) {
      url += '?id=' + localStorage.webstorageProxyId;
    }

    xhr.open("POST", url);
    xhr.onload = function() {
      var res = JSON.parse(xhr.responseText);
      try {
        if ( res.response == 'success' ) {
          localStorage.webstorageProxyId = res.id;
          $('#gallery-info').html('Gallery code: <strong>'+res.id+'</strong>');
        } else {
          //console.log('Save failed for some reason');
        }
      } catch (e) {
        console.log('Unexpected error from proxy saver:');
        console.log(res);
      }
    };

    // TOCO: Incompatibility of FormData (XHR2) with IE < 10
    var fd = new FormData();
    fd.append("data", JSON.stringify(this.list));
    xhr.send(fd);
  };

  /**
   * Sync PhotoList with localStorage
   */
  this.syncStorage = function () {
    if ('localStorage' in window && window.localStorage !== null) {
      // sync localStorage
      try {
        localStorage.setItem('photoList', JSON.stringify(this.list));

        var that = this;
        setTimeout(function() {
          that.syncOnlineDb();
        }, 100);

        // Refresh space meter
        this.updateStorageMeter();

      } catch (e) {
        console.log(e);
        //alert('Unfortunately probably there is no space for more photos, try deleting one');
      }
    }
  };

  /**
   * Update the storage meter
   */
  this.updateStorageMeter = function () {
        var usedSpace = this.getUsedStorage();
        var maxSpace = this.getMaxStorage();
        var el = document.getElementById('space');
        el.setAttribute('value', usedSpace);
        el.setAttribute('max', maxSpace);
        el.setAttribute('low', maxSpace * 0.4);
        el.setAttribute('high', maxSpace * 0.8);
        el.setAttribute('optimum', 1);
  };

  /**
   * Get the used storage by localStorage
   * @return integer Used local storage in bytes
   */
  this.getUsedStorage = function () {
    return unescape(encodeURIComponent(JSON.stringify(localStorage))).length;
  };

  /**
   * Get the remaining storage by localStorage
   * assume in most cases that we have 5MB limit
   * @return integer Remaining local storage in bytes
   */
  this.getRemainingStorage = function () {
    if ( typeof localStorage.remainingSpace != 'undefined' ) {
      return localStorage.remainingSpace; // IE
    } else {
      // BADLY imply 5 MB of max size
      return 5 * 1024 * 1024 - this.getUsedStorage();
    }
  };

  /**
   * Get the max storage of localStorage
   * @return integer Max local storage in bytes
   */
  this.getMaxStorage = function () {
    return this.getRemainingStorage() + this.getUsedStorage();
  };

  // VIEW of PhotoList
  this.renderList = function () {
    var html = '';
    if (!this.count())
      return '';

    for (var i in this.list) {
      var itemEl = this.list[i].presentItem();
      itemEl.setAttribute('data-itemid', i);
      html = itemEl.outerHTML + html;
    }
    return html;
  };

  this.showList = function () {
    var intro = document.getElementById('intro');
    intro.style.display = 'none';
    this.el.innerHTML = this.renderList() + intro.outerHTML;
    this.setupItemEvents();
  };

  this.setupItemEvents = function () {
    var that = this;
    var uploads = $('input[name="upload"]');
    var deletes = $('input[name="delete"]');
    var views = $('a.photoitem, input[name="view"]');

    // Delete event
    deletes.on('click keydown', function(e) {
      if(e.keyCode == 9) return; //TAB
      var sure = confirm('Are you sure you want to delete this photo?');
      if ( sure ) {
        that.del($(this).closest('[data-itemid]').attr('data-itemid'));
      }
    });

    // Upload event
    uploads.one('click keydown', function(e) {
      if(e.keyCode == 9) return; //TAB
      $(this)
        .addClass('loading')
        .attr('value', 'Uploading..');

      var item = $(this).closest('[data-itemid]');
      item.find('input').prop('disabled', 'disabled');

      that.upload(item.attr('data-itemid'));
    });

    // View event
    views.on('click keydown', function(e) {
      if($(e.target).not(views).length) {
        return false;
      }
      if(e.keyCode == 9) return; //TAB
      var item = $(this).closest('[data-itemid]').attr('data-itemid');
      that.get(item).fullViewItem();
    });

  };

  this.setupStaticEvents = function () {
    var thatPhotoList = this;
    $('#gallery-info input').on('click', function(e){
      var id = prompt('Please enter your 4 letter/digit gallery code:');
      if (id !== null) {
        $(this).prop('disabled', 'disabled');
        thatPhotoList.getOnlineDb(id);
      }
    });
  };

  this.onPhotoRefresh = function (e, thatPhotoList) {
    var i;
    if (typeof e.photo != 'undefined') {
      i = thatPhotoList.list.indexOf(e.photo);
    }

    if ( e.info == 'thumb' ) {
      $('a[data-itemid="' + i + '"] img')
        .attr('src', thatPhotoList.list[i].thumbData);
    } else if ( e.info == 'uploaded' ) {
      $('a[data-itemid="' + i + '"] input[name="upload"]')
        .removeClass('loading is-good')
        .attr('name', 'view')
        .attr('value', 'View')
        .add('a[data-itemid="' + i + '"]')
          .on('click keydown', function (e) {
            if(e.keyCode == 9) return; //TAB
            var itemId = $(this).closest('[data-itemid]').attr('data-itemid');
            thatPhotoList.get(itemId).fullViewItem();
          });

      $('a[data-itemid="' + i + '"] input')
        .prop('disabled', '');
    }

    this.syncStorage();
  };

  // INIT
  this.init = function (element) {
    // Check support
    if (!('localStorage' in window || window.localStorage === null)) {
      alert('Sorry but this demo requires localStorage to work. Please upgrade.');
    }

    this.setupStaticEvents();

    var thatPhotoList = this;
    // Watch for changes on the photos
    document.addEventListener('photoRefresh', function(e) { thatPhotoList.onPhotoRefresh(e, thatPhotoList); } , false);

    // Sync localStorage
    var savedPhotoList = localStorage.getItem('photoList');
    if ( savedPhotoList !== null ) {
      this.list = JSON.parse(savedPhotoList);
      // Mark previously added photos
      for ( var i in this.list ) {
        this.list[i].isCurrent = false;
        var oldPhoto = new Photo(this.list[i]);
        this.list[i] = oldPhoto;
      }

      // Show previously added images
      if ( this.count() ) {
        this.showList();
      }
    }

    // Was offline and came back online, so sync
    window.addEventListener("online", function() {
      thatPhotoList.syncOnlineDb();
    }, true);

    this.updateStorageMeter();
  };

  // PhotoList presentation setup
  this.list = [];
  this.el = typeof element == 'string' ? document.querySelector(element) : element;

  // If previously used online db check for changes
  var urlId = decodeURI((RegExp('id' + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]);
  if( urlId != 'null' && urlId !== null ){
    this.getOnlineDb(urlId);
  } else if( typeof localStorage.webstorageProxyId != 'undefined' ) {
    this.getOnlineDb();
  } else {
    this.init(element);
  }

}


// PHOTO
function Photo () {
  "use strict";

  this.THUMB_WIDTH = 100;
  this.THUMB_HEIGHT = 100;

  /**
   * Create Photo object from File
   * @param  File|Object file The intial construct should be done with the Native file created on input[file] change
   *                          After that we use a pseudo wrapper [TODOs]
   */
  this.createFromFile = function (file) {
    this.file = file.file || file;
    this.filename = file.filename || file.name;
    this.filesize = file.filesize || file.size;
    this.date = file.date || file.lastModifiedDate;
    this.isUploaded = (typeof file.isUploaded != 'undefined' ? file.isUploaded : false);
    this.isCurrent = (typeof file.isCurrent != 'undefined' ? file.isCurrent : true);
    this.thumbData = file.thumbData || null;
    this.fullData = file.fullData || null;
    if (typeof file.imgur != 'undefined'){
      this.imgur = file.imgur;
    }
  };

  /**
   * Upload (to imgur.com)
   */
  this.upload = function () {
    if (this.isUploaded) {
      console.log('This photo is already uploaded');
      return false;
    } else if (!this.isCurrent) {
      alert("This photo was added before but not uploaded, we only have the thumb. TODO something acceptable.\nFor now readd the photo and upload.");
      return false;
    }

    var thisPhoto = this;
    var fileToSend = (this.file instanceof File ? this.file : this.fullData);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://api.imgur.com/2/upload.json");
    xhr.onload = function() {
      var res = JSON.parse(xhr.responseText);

      thisPhoto.imgur = {
        full : res.upload.image.original,
        hash : res.upload.image.hash,
        deleteHash : res.upload.image.deletehash
      };

      // force update on image to use the new thumb
      thisPhoto.fullData  = res.upload.links.original;
      thisPhoto.thumbData = res.upload.links.small_square;
      thisPhoto.isUploaded= true;

      thisPhoto.dispatchChange('uploaded');
    };

    var fd = new FormData();
    fd.append("image", fileToSend);
    fd.append("key", IMGUR_API_KEY);
    xhr.send(fd);
  };

  /**
   * Delete from imgur
   */
  this.del = function () {
    $(this).closest('[data-itemid]').attr('data-itemid');

    if ( typeof this.imgur == 'undefined' ) {
      return -1; // No imgur data
    }

    // Create the XHR (Cross-Domain XHR FTW!!!)
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://api.imgur.com/2/delete/" + this.imgur.deleteHash + ".json"); // Boooom!
    xhr.onload = function() {
      var res = JSON.parse(xhr.responseText);
      if (res['delete'].message == 'Success') {
        console.log('Delete successfuly');
      } else {
        console.log('Deleting went wrong');
        console.log(res);
      }
    };

    var fd = new FormData();
    fd.append("key", IMGUR_API_KEY);
    xhr.send(fd);
  };

  this.dispatchChange = function (info) {
    var evt = document.createEvent('Event');
    evt.initEvent('photoRefresh', true, true);
    evt.photo = this;
    if(typeof info == 'undefined') {
      info = 'default';
    }
    evt.info = info;
    document.dispatchEvent(evt);
  };

  this.fullViewItem = function () {
    var fullView = $('<div>')
      .addClass('fullview')
      .append(
        $('<img>').attr('src', this.fullData)
      );
    fullView.on('click', function () {
      $(this).remove();
    });
    $('body').append(fullView);
  };

  this.presentItem = function () {
    var img = document.createElement('img');
    var URL = window.URL || window.webkitURL;
    var imgURL;

    if (this.isCurrent) {
      imgURL = URL.createObjectURL(this.file);
      img.src = imgURL;
    }

    var theImg = this.generateThumb(img);
    var html = '';
    var div = document.createElement('div');
    div.innerHTML = '<p>' + this.filename + '</p>' +
                    '<span>' + this.filesizeToString() + '</span>';
    var actionButton = document.createElement('input');
    actionButton.setAttribute('type', 'button');
    if (this.isUploaded) {
      actionButton.setAttribute('name', 'view');
      actionButton.setAttribute('value', 'View');
    } else {
      actionButton.setAttribute('name', 'upload');
      actionButton.setAttribute('value', 'Upload');
      actionButton.setAttribute('class', 'is-good');
    }

    var delButton = document.createElement('input');
    delButton.setAttribute('type', 'button');
    delButton.setAttribute('name', 'delete');
    delButton.setAttribute('value', 'Delete');
    delButton.setAttribute('class', 'is-bad');

    div.appendChild(actionButton);
    div.appendChild(delButton);

    var a = document.createElement('a');
    a.setAttribute('class', 'photoitem');
    a.appendChild(div);
    a.appendChild(theImg);

    return a;
  };

  /**
   * Filesize to formatted string
   * @return string formatted the file size
   */
  this.filesizeToString = function () {
    var factor = 'mb';
    var size = this.filesize / 1024;
    size /= (size > 1024 ? 1024 : (factor = 'kb', 1));
    size = Math.round(size * 100 ) / 100;

    return size + ' ' + factor;
  };

  /**
   * Resize an image
   * @param  string  element  Selector for the element that will be used to show the thumbnail
   * @param  integer width  Optional width size of resized image
   * @param  integer height Optional height size of resized image
   * @return string         A base64 encoded string of the resized image
   */
  this.generateThumb = function (element, width, height) {
    var el = (typeof element === 'string' ? document.querySelector(element) : element);

    // Previously generated thumb
    if ( this.thumbData !== null ) {
      el.setAttribute('src', this.thumbData);
      //TODE
      //thatPhoto.dispatchChange();
      return el;
    }

    // Previously saved photo but thumb is not saved to save space
    // Get full image and generate thumb again (Maybe rething this)
    /*if ( this.isCurrent != true || !this.file instanceof File ) {
      console.log('There is a big chance it will fail to create a thumb, Need a native File Object');
    }*/

    if ( typeof width == 'undefined' ) {
      width = this.THUMB_WIDTH;
    }
    if ( typeof height == 'undefined' ) {
      height = this.THUMB_HEIGHT;
    }

    var thatPhoto = this;

    // File -> Image
    var reader = new FileReader();
    reader.readAsDataURL( this.file );

    reader.onload = function ( ev ) {
      var img = new Image();
      img.src = ev.target.result;
      img.onload = function() {
        // Image -> Canvas & Resize on canvas
        var boundingBox = (this.width < this.height ? this.width : this.height);

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        var sx, sy, sWidth, sHeight,
            dx, dy, dWidth, dHeight;

        sx = sy = 0; // [TODO] Improve (Center @ 1/2 and Up at 1/6)
        sWidth = sHeight = boundingBox;
        dx = dy = 0;
        dWidth = canvas.width;
        dHeight = canvas.height;

        // This is heavy [TODO] to investigate for optimization
        context.drawImage(this, sx, sy, sWidth, sHeight,
                                dx, dy, dWidth, dHeight);

        // TODO Make mime decision based on resulting size
        var dataUrl = canvas.toDataURL('image/jpeg');

        // TODO performance/cleanup
        thatPhoto.thumbData = dataUrl;

        if (typeof URL != 'undefined' && typeof imgURL != 'undefined') {
          URL.revokeObjectURL(imgURL);
        }

        thatPhoto.dispatchChange('thumb'); // Inform that Photo has changed

        // IMPORTANT
        // Offering local copy of the image through localStorage
        // significantly slows down the app, use only when offline for now
        if (!navigator.onLine) {
          // We could risk making localStorage full and getting blocked
          if( ev.target.result.length < pl.getRemainingStorage() * 0.8 ) {
            thatPhoto.fullData = ev.target.result;
            thatPhoto.dispatchChange();
          }
        }
      };
    };

    // Temp loading thumb
    var tmpImg = document.createElement('img');
    tmpImg.src = 'assets/images/spacer.gif';
    return tmpImg;
  };

  // Init
  if ( arguments.length == 1 || arguments[0] instanceof File ) {
    this.createFromFile(arguments[0]);
  }

}
