export enum PodcastVars {
  PODCAST_QUERY_LIMIT = 40
}

enum PodcastIds {
  EXPN_RSS_FEED_ID = '672246926',
  EXPN_USER_ID = '827686943',
  MDLS_RSS_FEED_ID = 'TBD',
  MDLS_USER_ID = 'TBD',
  SYW_RSS_FEED_ID = '881743030',
  SYW_USER_ID = '854309119',
  ADVE_RSS_FEED_ID = '918731671',
  ADVE_USER_ID = '316228829',
}

export const PODCAST_PATHS = {
  expn: {
    rssFeedPath: `https://feeds.soundcloud.com/users/soundcloud:users:${PodcastIds.EXPN_RSS_FEED_ID}/sounds.rss`,
    landingPageUrl: `https://soundcloud.com/user-${PodcastIds.EXPN_USER_ID}`,
    // tslint:disable-next-line: max-line-length
    embeddedPlayerUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/users/${PodcastIds.EXPN_RSS_FEED_ID}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=true`
  },
  mdls: {
    rssFeedPath: `https://feeds.soundcloud.com/users/soundcloud:users:${PodcastIds.MDLS_RSS_FEED_ID}/sounds.rss`,
    landingPageUrl: `https://soundcloud.com/user-${PodcastIds.MDLS_USER_ID}`,
    // tslint:disable-next-line: max-line-length
    embeddedPlayerUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/users/${PodcastIds.MDLS_RSS_FEED_ID}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=true`
  },
  syw: {
    rssFeedPath: `https://feeds.soundcloud.com/users/soundcloud:users:${PodcastIds.SYW_RSS_FEED_ID}/sounds.rss`,
    landingPageUrl: `https://soundcloud.com/user-${PodcastIds.SYW_USER_ID}`,
    // tslint:disable-next-line: max-line-length
    embeddedPlayerUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/users/${PodcastIds.SYW_RSS_FEED_ID}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=true`
  },
  adve: {
    rssFeedPath: `https://feeds.soundcloud.com/users/soundcloud:users:${PodcastIds.ADVE_RSS_FEED_ID}/sounds.rss`,
    landingPageUrl: `https://soundcloud.com/user-${PodcastIds.ADVE_USER_ID}`,
    // tslint:disable-next-line: max-line-length
    embeddedPlayerUrl: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/users/${PodcastIds.ADVE_RSS_FEED_ID}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=true`
  }
};
