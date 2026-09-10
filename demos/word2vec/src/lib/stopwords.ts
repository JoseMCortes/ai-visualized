/** A small English stop-word list — function words carry no topical signal. */

export const STOPWORDS = new Set<string>(
  (
    'a an the this that these those i you he she it we they me him her us them my your his its our ' +
    'their mine yours hers ours theirs myself yourself himself herself itself ourselves themselves ' +
    'is am are was were be been being do does did doing have has had having will would shall should ' +
    'can could may might must ought need dare used ' +
    'and or but nor so yet for if then than because while when where what which who whom whose how ' +
    'why as until since though although unless whether either neither both each every all any some ' +
    'no not none only own same other another such more most less least very too also just even ' +
    'to of in on at by with from into onto upon over under above below up down out off through ' +
    'about after before between among against during without within along across around near ' +
    'here there now again once ever never always often sometimes soon still already almost quite ' +
    'get got go going went come came make made take took give gave put said say says ' +
    'one two three first last next many much few several ' +
    's t d ll ve re m o y ain aren couldn didn doesn don hadn hasn haven isn ma mightn mustn needn ' +
    'shan shouldn wasn weren won wouldn ' +
    'thou thee thy thine art hath doth ye o oh ah'
  ).split(/\s+/),
);
