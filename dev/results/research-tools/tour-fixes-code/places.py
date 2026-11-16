import json, random, collections, sys
d='public/nepal-data/'
E=json.load(open(d+'entities.json')); R=json.load(open(d+'relationships.json'))
tpl={e['sharedId']:e['template'] for e in E}; title={e['sharedId']:e['title'] for e in E}
print(collections.Counter(tpl.values()))
adj=collections.defaultdict(set)
for r in R: adj[r['from']].add(r['to']); adj[r['to']].add(r['from'])
deg=sorted(((len(adj[k]),k) for k in adj if tpl.get(k)=='nepal_location'),reverse=True)[:10]
for n,k in deg: print(n,title[k], collections.Counter(tpl.get(x) for x in adj[k]).most_common(4))
def bfs(a,b,skip,maxh=4):
  dist={a:0}; par=collections.defaultdict(list); fr=[a]; found=False
  for dd in range(maxh):
    if not fr or found: break
    nx=[]
    for u in fr:
      for v in adj[u]:
        if v!=b and tpl.get(v) in skip: continue
        if v not in dist: dist[v]=dd+1; par[v].append(u); (found:=True) if v==b else nx.append(v)
        elif dist[v]==dd+1: par[v].append(u)
    fr=nx
  if b not in dist: return None,0,0
  # count paths and paths through a location
  memo={}
  def cnt(n):
    if n==a: return (1,0)
    if n in memo: return memo[n]
    t=p=0
    for q in par[n]:
      ct,cp=cnt(q); t+=ct; p+= ct if (q!=a and tpl.get(q)=='nepal_location') else cp
    memo[n]=(t,p); return memo[n]
  t,p=cnt(b); return dist[b],t,p
random.seed(1)
kinds=['nepal_person','nepal_organisation','nepal_event']
pool=[k for k in adj if tpl.get(k) in kinds]
S={'nepal_source'}; SP={'nepal_source','nepal_location'}
stats=collections.Counter(); hopsA=[];hopsB=[]
for i in range(600):
  a,b=random.sample(pool,2)
  hA,tA,pA=bfs(a,b,S); hB,_,_=bfs(a,b,SP)
  if hA is None: stats['none_with_places']+=1; continue
  stats['found']+=1
  hopsA.append(hA)
  if pA==tA: stats['all_shortest_via_place']+=1
  elif pA>0: stats['some_via_place']+=1
  if hB is None: stats['lost_without_places']+=1
  else:
    hopsB.append(hB)
    if hB>hA: stats['longer_without_places']+=1
print(stats); print('mean hops with places',sum(hopsA)/len(hopsA),'without',sum(hopsB)/max(1,len(hopsB)))
print(collections.Counter(hopsA), collections.Counter(hopsB))
# which places carry the place-routed shortest paths, and person/org-only pairs
random.seed(1); via=collections.Counter()
def placesOnPaths(a,b):
  dist={a:0}; par=collections.defaultdict(list); fr=[a]; found=False
  for dd in range(4):
    if not fr or found: break
    nx=[]
    for u in fr:
      for v in adj[u]:
        if v!=b and tpl.get(v)=='nepal_source': continue
        if v not in dist: dist[v]=dd+1; par[v].append(u); (found:=True) if v==b else nx.append(v)
        elif dist[v]==dd+1: par[v].append(u)
    fr=nx
  if b not in dist: return set()
  seen=set(); st=[b]; out=set()
  while st:
    n=st.pop()
    for q in par[n]:
      if q not in seen: seen.add(q); st.append(q); (out.add(title[q]) if tpl.get(q)=='nepal_location' else None)
  return out
for i in range(600):
  a,b=random.sample(pool,2)
  for t in placesOnPaths(a,b): via[t]+=1
print(via.most_common(8))
po=[k for k in adj if tpl.get(k) in ('nepal_person','nepal_organisation')]
st=collections.Counter()
for i in range(400):
  a,b=random.sample(po,2); hA,tA,pA=bfs(a,b,S); hB,_,_=bfs(a,b,SP)
  if hA is None: continue
  st['found']+=1; st['via_place_any']+= pA>0; st['all_via_place']+= pA==tA; st['lost']+= hB is None; st['longer']+= (hB is not None and hB>hA)
print('person/org pairs', st)
