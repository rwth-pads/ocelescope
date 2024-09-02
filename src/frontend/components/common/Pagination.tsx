
import { combineClassNames } from '@/src/util';
import _ from 'lodash';
import BsPagination, { PaginationProps } from 'react-bootstrap/Pagination';

// number of page links to show on the edges
const edgeDelta: Record<string, number> = {
  "xs": 0,
  "md": 1,
  "lg": 2,
  "xl": 3
}
// number of page links to show around the current page
const centerDelta: Record<string, number> = {
  "xs": 1,
  "md": 2,
  "lg": 3,
  "xl": 4
}

const breakpoints = _.intersection(Object.keys(edgeDelta), Object.keys(centerDelta))


const Pagination: React.FC<PaginationProps & {
  min?: number
  max: number
  current: number
  setCurrent: (p: number) => void
}> = ({ min = 1, max, current, setCurrent, className, ...props }) => {

  const num = max - min + 1
  if (num < 1) {
    return false
  }

  const visiblePages = Object.fromEntries(breakpoints.map(bp => {
    if (!(bp in edgeDelta && bp in centerDelta)) {
      return [bp, []]
    }
    const e = edgeDelta[bp], c = centerDelta[bp]

    return [bp, _.sortBy(Array.from(new Set([
      ..._.range(min, min + e as number),
      ..._.range(current - c, current + c + 1),
      ..._.range(max - e + 1, max + 1)
    ])).filter(p => p >= min && p <= max), x => x)]
  }))

  const visiblePagesWithEllipses = Object.fromEntries(Object.entries(visiblePages).map(([bp, ps]) => [bp, [
    ...(ps[0] != min ? (ps[0] == min + 1 ? [min] : [null]) : []),
    ...ps.flatMap((p, i) => {
      if (i == 0) return [p]
      if (visiblePages[bp][i - 1] == p - 1) return [p]
      if (visiblePages[bp][i - 1] == p - 2) return [p - 1, p]  // no ellipsis just omitting one page
      return [null, p]  // add ellipsis
    }),
    ...(ps[ps.length - 1] != max ? (ps[ps.length - 1] == max - 1 ? [max] : [null]) : [])
  ]]))

  return (<>
    {Object.entries(visiblePagesWithEllipses).map(([bp, pages], k) => {
      const nextBreakpoint = breakpoints[k + 1]

      const classes = [
        className,
        "mb-0",
        bp != "xs" ? "d-none" : undefined,
        `d-${bp}-flex`,
        nextBreakpoint ? `d-${nextBreakpoint}-none` : undefined
      ]

      return (
        <BsPagination key={k} className={combineClassNames(...classes)} {...props}>
          <BsPagination.First disabled={current == min} onClick={() => setCurrent(min)} />
          {num > 2 && <BsPagination.Prev className="d-none d-sm-block" disabled={current == min} onClick={() => { if (current > min) setCurrent(current - 1) }} />}

          {pages.map((p, i) => p === null ? (<BsPagination.Ellipsis key={i} />) : (
            <BsPagination.Item
              key={i}
              active={current == p && num > 1}
              disabled={num == 1}
              onClick={() => setCurrent(p)}
            >
              {p}
            </BsPagination.Item>
          ))}

          {num > 2 && <BsPagination.Next className="d-none d-sm-block" disabled={current == max} onClick={() => { if (current < max) setCurrent(current + 1) }} />}
          <BsPagination.Last disabled={current == max} onClick={() => setCurrent(max)} />
        </BsPagination>
      )

    })}
  </>)

}

export default Pagination;
