import { Line } from '../ui/map/Line.js';
// eslint-disable-next-line no-unused-vars
import { Point } from '../ui/map/Point.js';

/**
 *
 * @param {Point[]} points
 * @returns
 */
export function quickHull(points) {
    const hull = [];
    // triangle
    if(points.length == 3) {
        return points;
    }
    const baseline = getMinMaxPoints(points);
    addSegments(baseline, points, hull);
    addSegments(baseline.toReversed(), points, hull);
    return hull;
}

/**
 * @param {Point[]} points
 */
function getMinMaxPoints(points) {
    return new Line(
        points.reduce((min, cur)=>min && min.x < cur.x ? min : cur),
        points.reduce((max, cur)=>max && max.x > cur.x ? max : cur),
    );
}

/**
 * @param {Point} point
 * @param {Line} line
 */
function distanceFromLine(point, line) {
    var vY = line.b.y - line.a.y;
    var vX = line.a.x - line.b.x;
    return (vX * (point.y - line.a.y) + vY * (point.x - line.a.x));
}

/**
 * Determines the set of points that lay outside the line (positive), and the most distal point
 * Returns: {points: [ [x1, y1], ... ], max: [x,y] ]
 * @param {Point[]} points
 * @param {Line} line
 */
function getOuterAndFurthestPoints(line, points) {
    const outerPoints = [];
    let maxDist = 0;
    let furthestPoint;

    for (const p of points) {
        const dist = distanceFromLine(p, line);
        if (dist > 0) outerPoints.push(p);
        else continue;

        if (dist > maxDist) {
            furthestPoint = p;
            maxDist = dist;
        }
    }

    return { outerPoints, furthestPoint };
}

/**
 * Recursively adds hull segments
 * @param {Line} line
 * @param {Point[]} points
 * @param {Point[]} hull
 */
function addSegments(line, points, hull) {
    const { outerPoints, furthestPoint } = getOuterAndFurthestPoints(line, points);
    if(!furthestPoint) return hull.push(line.a);
    addSegments(new Line(line.a, furthestPoint), outerPoints, hull);
    addSegments(new Line(furthestPoint, line.b), outerPoints, hull);
}
