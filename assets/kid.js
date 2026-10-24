// Pixel-art parts for the young pirate-wannabe. Every frame is 16x32 and is
// assembled from a head (rows 0-10), a torso (rows 11-19) and legs (rows 20-31).
// Side views face right; facing left is the same frame mirrored.
// Legend: k outline, h/H/Y hair, s/S skin, e eye, m mouth, w/W shirt,
// b/B belt and buckle, p/P trousers, o/O boots. In side views 1/3 are the
// near leg and boot, 2/4 the far ones, so the walk cycle can swap them.
window.KID = {
  palette: {
    k: '#1e1426', h: '#f2cb55', H: '#b98428', Y: '#fff1a6',
    s: '#f3b58a', S: '#c47a58', e: '#1e1426', m: '#d9937a', M: '#6e2230',
    w: '#f1ede2', W: '#aaa3c2', b: '#5c3418', B: '#e8c23a',
    p: '#3a4684', P: '#252a58', o: '#6e3c1c', O: '#40200e',
    1: '#3a4684', 2: '#252a58', 3: '#6e3c1c', 4: '#40200e'
  },

  head: {
    front: [
      '.....kkkkkk.....',
      '...kkhhYYhhkk...',
      '..khhhYYhhhhhk..',
      '..khhhhhhhhhhk..',
      '.kHhhhhhhhhhhHk.',
      '.kHhsshhhhsshHk.',
      '.kHssessssessHk.',
      '..kSssssSsssSk..',
      '..kssssmmssssk..',
      '...kSssssssSk...',
      '....kksSSskk....'
    ],
    back: [
      '.....kkkkkk.....',
      '...kkhhYYhhkk...',
      '..khhhYYhhhhhk..',
      '..khhhhhhhhhhk..',
      '.kHhhhhhhhhhhHk.',
      '.kHhhhhhhhhhhHk.',
      '.kHHhhhhhhhhHHk.',
      '..kHHhhhhhhHHk..',
      '..ksHHhhhhHHsk..',
      '...kSsHhhHsSk...',
      '....kkkHhkkk....'
    ],
    side: [
      '....kkkkkk......',
      '..kkhYYhhhkk....',
      '.khhYYhhhhhhk...',
      '.khhhhhhhhhhhk..',
      'khhhhHhhhhhhhhk.',
      'kHhhHhhhhhhsssk.',
      'kHhHhhhSsssessk.',
      '.kHHhhhSssssssSk',
      '.kkHHhhsssssmk..',
      'khHk.kSsssssk...',
      'kHk...kSSssk....'
    ]
  },

  torso: {
    front: [
      '....kwwsswwk....',
      '..kkwwwsswwwkk..',
      '.kwwwwwwwwwwwwk.',
      '.kwwWkwwwwkWwwk.',
      '.kwWWkwwwwkWWwk.',
      '.kWWWkwwwwkWWWk.',
      '.kWWkkwwWwkkWWk.',
      '.ksskkbbBbkkssk.',
      '..kk.kppppk.kk..'
    ],
    back: [
      '....kwwHhwwk....',
      '..kkwwwHkwwwkk..',
      '.kwwwwwwwwwwwwk.',
      '.kwwWkwWWwkWwwk.',
      '.kwWWkwwwwkWWwk.',
      '.kWWWkwWWwkWWWk.',
      '.kWWkkwwwwkkWWk.',
      '.ksskkbbbbkkssk.',
      '..kk.kppppk.kk..'
    ],
    side: [
      'kHk..kwssk......',
      '.k..kwwwwwk.....',
      '....kwwwwwwk....',
      '....kwwwwwwk....',
      '....kwWwwwwk....',
      '....kWWwwwWk....',
      '....kWWwwWWk....',
      '....kbbbbBbk....',
      '....kppppppk....'
    ]
  },

  // Near arm for side views, stamped on the torso at [col, row].
  arm: {
    down: { at: [6, 12], rows: [
      '.kk.',
      'kwwk',
      'kwWk',
      'kwWk',
      'kWWk',
      '.ksk',
      '.kk.'
    ] },
    forward: { at: [7, 12], rows: [
      '.kk...',
      'kwwk..',
      'kwWWk.',
      '.kWWk.',
      '..kssk',
      '...kk.'
    ] },
    back: { at: [3, 12], rows: [
      '..kk.',
      '.kwwk',
      '.kwWk',
      'kWWk.',
      'ksk..',
      '.k...'
    ] }
  },

  legs: {
    frontStand: [
      '.....kppppk.....',
      '....kppPppPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....koOkkoOk....',
      '...kooOkkooOk...',
      '...kooOkkooOk...',
      '...kkkkkkkkkk...'
    ],
    frontStep: [
      '.....kppppk.....',
      '....kppPppPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....kpPkkpPk....',
      '....koOkkpPk....',
      '...kooOkkpPk....',
      '...kooOkkoOk....',
      '...kkkkkkooOk...',
      '........kooOk...',
      '........kkkkk...'
    ],
    sideStand: [
      '....k221111k....',
      '.....k2111k.....',
      '.....k2111k.....',
      '.....k2111k.....',
      '.....k2111k.....',
      '.....k2111k.....',
      '.....k2111k.....',
      '.....k2111k.....',
      '.....k4333k.....',
      '.....k43333k....',
      '.....k433333k...',
      '.....kkkkkkkk...'
    ],
    sideContact: [
      '....k221111k....',
      '....k22kk11k....',
      '...k22k..k11k...',
      '...k22k..k111k..',
      '..k22k....k11k..',
      '..k22k....k111k.',
      '.k22k......k11k.',
      '.k22k......k11k.',
      '.k44k......k333k',
      'k444k......k333k',
      'k44k.......k333k',
      'kkkk.......kkkkk'
    ],
    sidePass: [
      '....k221111k....',
      '....k22k111k....',
      '...k22k.k111k...',
      '...k22k.k111k...',
      '..k22k..k111k...',
      '..k44k..k111k...',
      '..k44k..k111k...',
      '...kk...k111k...',
      '........k3333k..',
      '........k33333k.',
      '........k33333k.',
      '........kkkkkkk.'
    ]
  }
};
