// @ts-nocheck

var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

function exit() {
  // http://kevin.vanzonneveld.net
  // +   original by: Brett Zamir (http://brettz9.blogspot.com)
  // +      input by: Paul
  // +   bugfixed by: Hyam Singer (http://www.impact-computing.com/)
  // +   improved by: Philip Peterson
  // +   bugfixed by: Brett Zamir (http://brettz9.blogspot.com)
  // %        note 1: Should be considered expirimental. Please comment on this function.
  // *     example 1: exit();
  // *     returns 1: null

  window.addEventListener(
    "error",
    function(e) {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );

  throw "";
}

if (isMobile) exit();

const channels = [
  {
    title: "general",
    subreddit: "videos",
    minNumOfVotes: 50
  },
  {
    title: "curious",
    subreddit:
      "curiousvideos;interview;mealtimevideos;futurology;educativevideos;watchandlearn;sciencevideos",
    minNumOfVotes: 3
  },
  {
    title: "academic",
    subreddit: "lectures;physics;biology;psychology;space;philosophy;math",
    minNumOfVotes: 0
  },
  {
    title: "movies",
    subreddit:
      "television;documentaries;fullmoviesonyoutube;trailers;themakingof;filmmakers;movies;shortfilms;shortfilm;horror;shorthorror;animation;Truefilm",
    minNumOfVotes: 0
  },
  {
    title: "music",
    subreddit: "listentothis",
    minNumOfVotes: 5
  },
  {
    title: "comedy",
    subreddit:
      "nottimanderic;StandUpComedy;humor;contagiouslaughter;accidentalcomedy;aww",
    minNumOfVotes: 5
  },
  {
    title: "active",
    subreddit: "adrenalin;climbing;kayaking;theocho;surfing;MMA",
    minNumOfVotes: 5
  },
  {
    title: "crafts",
    subreddit: "artisanvideos;maker;howto;TechDIY;woodworking;FastWorkers",
    minNumOfVotes: 5
  },
  {
    title: "gaming",
    subreddit:
      "gamernew;Games;themakingofgames;AndroidGaming;indiegames;gamingvids;YouTubeGamers",
    textColor: "",
    minNumOfVotes: 5
  },
  {
    title: "food",
    subreddit: "veganrecipes;permaculture;FoodVideos",
    textColor: "",
    minNumOfVotes: 5
  },
  {
    title: "news",
    subreddit: "politicalvideos",
    minNumOfVotes: 0
  },
  {
    title: "past",
    subreddit: "obsuremedia",
    minNumOfVotes: 0
  },
  {
    title: "kids",
    subreddit: "kidsafevideos",
    minNumOfVotes: 0
  }
];

const youtubeURL = "http://www.youtube.com/watch?v=";
const youtubeURLLength = youtubeURL.length;
const embedLength = "/embed/".length;

function RedditVideoService() {
  function isVideoObject(obj) {
    var data = obj.data;
    // reddit videos
    if (data.is_video === true) return true;

    // debug only - return only reddit videos
    // return false;

    if (data.media !== null) {
      return (
        data.media.type.includes("youtube.com") ||
        data.media.type.includes("vimeo.com")
      );
    }
    return false;
  }

  function filterByUpvotes(video, upsMin) {
    return video.data.ups >= upsMin;
  }

  function childObjectToDomainVideoModel(video) {
    const data = video.data;
    const result = {};
    result.title = data.title;
    result.id = data.id;
    result.permalink = data.permalink;
    result.created_utc = data.created_utc;

    // if (data.preview && data.preview.images) {
    //   const images = data.preview.images[0].resolutions;
    //   result.posterSource = images[images.length - 1].url;
    // }

    // reddit video
    if (data.is_video) {
      result.videoUrl = data.media.reddit_video.fallback_url;
      result.type = "reddit";
      return result;
    }

    // if (data.media === undefined) {
    //   return {};
    // }

    // youtube video
    if (data.media.type === "youtube.com") {
      const { oembed } = data.media;
      result.type = "youtube";

      if (oembed.url && oembed.url.indexOf(youtubeURL) === 0) {
        return (result.videoUrl = oembed.html.substring(youtubeURLLength));
      } else {
        const { html } = oembed;
        const startIndex = html.indexOf("/embed/") + embedLength;
        const endIndex = html.indexOf("?");
        result.videoUrl = html.substring(startIndex, endIndex);
        result.youtubeId = html.substring(startIndex, endIndex);
      }
    }

    // vimeo video
    if (data.media.type === "vimeo.com") {
      result.videoUrl = "vimeo.com";
      result.type = "vimeo";
    }

    return result;
  }

  // eslint-disable-next-line no-unused-vars
  function dynamicSort(property) {
    let sortOrder = 1;
    if (property[0] === "-") {
      sortOrder = -1;
      property = property.substr(1);
    }
    return function(a, b) {
      const result =
        a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
      return result * sortOrder;
    };
  }

  function _loadHot(channel, upsMin, after) {
    return new Promise((result, reject) => {
      if (typeof channel !== "string") {
        return reject(
          new Error("Bad channel argument value. Channel should be a string")
        );
      }
      let query = reddit.hot(channel).limit(50);
      if (after) query = query.after(after);

      query.fetch(
        res => {
          if (res.error) return reject(res);
          let videos = res.data.children.filter(isVideoObject);

          if (upsMin) {
            videos = videos.filter(vid => filterByUpvotes(vid, upsMin));
          }

          videos = videos
            .map(childObjectToDomainVideoModel)
            .filter(v => v.type === "youtube");

          result(videos);
        },
        // err contains the error from Reddit
        err => reject(err)
      );
    });
  }

  /**
   * e.g.
   * arrayOfArrays =
   * [[1,2,3], [4,5,6,7,8], [9,10]]
   *
   * return
   * [1, 4, 9, 2, 5, 10, 3, 6, 7, 8]
   *
   * TODO: if we skipped the video of a channel the 2nd video
   */
  function getOneVideoOfEachChannel(arrayOfArrays) {
    // find the smallest amount of videos for every channel
    const leastAmountOfVids = Math.min.apply(
      null,
      arrayOfArrays.map(arr => arr.length)
    );

    if (arrayOfArrays.length === 1) {
      return arrayOfArrays;
    }

    let videos = [];
    // get one video of each channel in rotation
    for (let i = 0; i < leastAmountOfVids; i++) {
      for (let j = 0; j < arrayOfArrays.length; j++) {
        const vid = arrayOfArrays[j][i];
        videos.push(vid);
      }
    }
    // get the rest of videos
    for (let k = 0; k < arrayOfArrays.length; k++) {
      const vid = arrayOfArrays[k].slice(leastAmountOfVids);
      videos.push(...vid);
    }

    return videos;
  }

  /**
   * Get videos from subreddit(s)
   *
   * @param {string} channel_s one or more channels - e.g. 'funny' or' 'funny;cool'
   * @param {number} upsMin minimum amount of up votes per video
   * @param {*} after reddit id to load more videos (TODO:)
   */
  async function loadHot(channel_s, upsMin) {
    // TODO: implement "after" param for multiple channels
    channel_s = channel_s.split(";");
    // console.warn("fetching", channel_s.length, "channels");
    const promises = channel_s.map(channel => _loadHot(channel, upsMin));

    const arrayOfArrayOfVideos = await Promise.all(promises);

    let videos = getOneVideoOfEachChannel(arrayOfArrayOfVideos);

    const uniq = {};
    // remove duplicate videos
    videos = videos.filter(
      arr => !uniq[arr.videoUrl] && (uniq[arr.videoUrl] = true)
    );

    return [].concat.apply([], videos);
    // .sort(dynamicSort("created_utc"));
  }

  // public interface
  return {
    loadHot
  };
}

const redditVideoService = new RedditVideoService();

var youtubeId,
  player,
  tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// The onYouTubeIframeAPIReady function will execute as soon as the player API code downloads
// eslint-disable-next-line no-unused-vars
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "390",
    width: "640",
    videoId: youtubeId,
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    },
    playerVars: {
      controls: 1,
      showinfo: 0,
      rel: 0,
      iv_load_policy: 3,
      origin: "https://walnut.tv"
    }
  });
}
function onPlayerReady() {
  appVideo.videoList[0] && appVideo.play(0);
}
function onPlayerError() {
  appVideo.nextVideo();
}
function onPlayerStateChange(t) {
  0 === t.data && appVideo.autoplay && appVideo.nextVideo();
}

var topOfComments = $("div.video-details").offset().top;
$(".video-container").on("scroll", function() {
  if (0 == appVideo.mobile) {
    var t = document.getElementById("video-container").scrollTop,
      e = topOfComments,
      n;
    n = t > e ? !0 : !1;
    $(".videoPlayer").toggleClass("sticky", n);
  }
});
Vue.config.unsafeDelimiters = ["{!!", "!!}"];
Vue.config.debug = !0;
Vue.filter("maxChar", function(t) {
  var e = t;
  return (
    void 0 != e &&
      e.length > 90 &&
      (e =
        jQuery
          .trim(e)
          .substring(0, 80)
          .split(" ")
          .slice(0, -1)
          .join(" ") + "..."),
    e
  );
});
Vue.filter("toUrl", function(t) {
  return "https://img.youtube.com/vi/" + t + "/mqdefault.jpg";
});

var paths = window.location.pathname.split("/").filter(a => a);

var appVideo = new Vue({
  el: "#appVideo",
  data: {
    // get the channel after the first slash
    channel: paths.length === 1 && paths[0],
    channels: channels,
    videoList: [],
    videosWatched: [],
    playingVideo: [],
    videoPlaying: 0,
    commentList: [],
    loadingComments: !0,
    loadingVideos: !1,
    videoMessage:
      'Loading Videos <img src="/img/spin.svg" class="loading" alt="Loading Videos">',
    commentsLoaded: !1,
    autoplay: !0,
    viewingComments: !1,
    mobile: !1
  },
  created: function() {
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) && (this.mobile = !0);
    this.fetchVideos();
    window.addEventListener("keyup", this.keys);
  },
  methods: {
    slide: function(t) {
      $("." + t).toggle();
      "+" == $("span.id-" + t).text()
        ? $("span.id-" + t).html("−")
        : $("span.id-" + t).html("+");
    },
    getSubReddits: function(channel) {
      return channels.find(function(c) {
        return c.title == channel;
      }).subreddit;
    },
    fetchVideos: function() {
      var self = this;
      var subreddits;
      this.channel || (this.channel = "general");
      if (window.location.pathname.split("/r/").length > 1) {
        subreddits = this.channel;
      } else {
        subreddits = this.getSubReddits(this.channel);
      }
      this.getStorage();
      redditVideoService
        .loadHot(
          subreddits
          // item.minNumOfVotes
        )
        .then(function(t) {
          self.videoList = t;
          t.length > 0
            ? ((self.loadingVideos = !0),
              self.watched(self.videoList[0].youtubeId))
            : (self.videoMessage =
                "Sorry, we couldn't find any videos in /r/" +
                self.subreddit +
                ".");
          self.playingVideo = t[0];
          self.playVideo(self.playingVideo);
        })
        // eslint-disable-next-line no-console
        .catch(error => console.error(error));
    },
    hasBeenWatched: function(t) {
      return -1 != this.videosWatched.indexOf(t) &&
        t != this.videoList[this.videoPlaying].youtubeId
        ? !0
        : !1;
    },
    watched: function(t) {
      -1 == this.videosWatched.indexOf(t) &&
        (this.videosWatched.push(t), this.setStorage());
    },
    keys: function(t) {
      t = t || window.event;
      "37" == t.keyCode
        ? this.prevVideo()
        : "39" == t.keyCode && this.nextVideo();
    },
    playVideo: function(t) {
      if (player && player.loadVideoById)
        player.loadVideoById(t.youtubeId, 0, "large");
    },
    play: function(t) {
      this.playingVideo = this.videoList[t];
      this.videoPlaying = t;
      this.loaded = !1;
      this.loading = !1;
      this.watched(this.videoList[t].youtubeId);
      this.mobile
        ? player.cueVideoById(this.videoList[t].youtubeId, 0, "large")
        : player.loadVideoById(this.videoList[t].youtubeId, 0, "large");
    },
    nextVideo: function() {
      if (this.videoPlaying < this.videoList.length - 1) {
        this.videoPlaying++;
        this.play(this.videoPlaying);
        var t = $("#toolbox"),
          e = t.scrollTop(),
          n = $(".active")
            .parent()
            .height();
        t.scrollTop(e + (n + 1));
      }
    },
    prevVideo: function() {
      if (this.videoPlaying > 0) {
        this.videoPlaying--;
        this.play(this.videoPlaying);
        var t = $("#toolbox"),
          e = t.scrollTop(),
          n = $(".active")
            .parent()
            .height();
        t.scrollTop(e - (n + 1));
      }
    },
    getStorage: function() {
      if (
        this.storageAvailable("localStorage") &&
        localStorage.getItem("videosWatched")
      ) {
        var t = localStorage.getItem("videosWatched");
        this.videosWatched = JSON.parse(t);
      }
    },
    setStorage: function() {
      if (this.storageAvailable("localStorage")) {
        var t = JSON.stringify(this.videosWatched);
        localStorage.setItem("videosWatched", t);
      }
    },
    storageAvailable: function(t) {
      try {
        var e = window[t],
          n = "__storage_test__";
        return e.setItem(n, n), e.removeItem(n), !0;
      } catch (i) {
        return !1;
      }
    },
    isT1: function(t) {
      return "t1" == t ? !0 : !1;
    },
    changeChannel: function(channel) {
      if (this.channel !== channel) {
        this.channel = channel;
        this.fetchVideos();
        window.history.replaceState(null, null, channel);
      }
    }
  },
  beforeDestroy: function() {
    window.removeEventListener("keyup", this.keys);
  }
});
